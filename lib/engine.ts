import { createClient } from "@supabase/supabase-js";
import type { Campaign, CampaignLead, Lead, WorkflowNode, KnowledgeBaseItem } from "@/types";
import {
  parseWorkflow,
  runWorkflow,
  type ParsedWorkflow,
  type ParsedWorkflowNode,
  type WorkflowHandlers,
} from "@/lib/workflow-engine";
import {
  checkSuppression,
  buildComplianceFooter,
  buildUnsubscribeUrl,
} from "@/lib/compliance";
import {
  getEffectiveDailyLimit,
  advanceWarmupDay,
  recordDeliverabilityEvent,
  classifyBounceType,
} from "@/lib/deliverability";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getCampaignLabelName(productName: string, campaignName: string): string {
  return `${productName} - ${campaignName}`;
}

async function ensureCampaignLabel(
  supabase: ReturnType<typeof getSupabase>,
  campaign: Campaign,
  productName: string
): Promise<string | null> {
  const { getOrCreateLabel } = await import("@/lib/gmail");
  const labelName = getCampaignLabelName(productName, campaign.name);
  const labelId = await getOrCreateLabel(labelName);

  if (campaign.gmail_label_id !== labelId) {
    await supabase
      .from("campaigns")
      .update({ gmail_label_id: labelId })
      .eq("id", campaign.id);
    campaign.gmail_label_id = labelId;
  }

  return labelId;
}

async function claimCampaignLead(
  supabase: ReturnType<typeof getSupabase>,
  campaignLeadId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("campaign_leads")
    .update({
      status: "active",
      last_action_time: new Date().toISOString(),
    })
    .eq("id", campaignLeadId)
    .in("status", ["queued", "waiting"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

async function logAction(
  supabase: ReturnType<typeof getSupabase>,
  campaignLeadId: string,
  action: string,
  status: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from("logs").insert({
    campaign_lead_id: campaignLeadId,
    action,
    status,
    metadata: metadata || null,
  });
}

async function markFailed(
  supabase: ReturnType<typeof getSupabase>,
  campaignLeadId: string,
  reason: string
) {
  await supabase
    .from("campaign_leads")
    .update({
      status: "failed",
      last_action_time: new Date().toISOString(),
    })
    .eq("id", campaignLeadId);

  await logAction(supabase, campaignLeadId, "error", "failed", { reason });
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    ("message" in error && typeof error.message === "string" ? error.message : "") ||
    ("details" in error && typeof error.details === "string" ? error.details : "");
  return message.includes(columnName);
}

async function persistThreadState(
  supabase: ReturnType<typeof getSupabase>,
  campaignLeadId: string,
  values: {
    threadId: string;
    lastMessageId: string | undefined;
    threadSubject: string | undefined;
  }
) {
  const fullUpdate = {
    thread_id: values.threadId,
    last_message_id: values.lastMessageId || null,
    thread_subject: values.threadSubject || null,
  };

  const { error } = await supabase
    .from("campaign_leads")
    .update(fullUpdate)
    .eq("id", campaignLeadId);

  if (!error) return;

  if (
    isMissingColumnError(error, "last_message_id") ||
    isMissingColumnError(error, "thread_subject")
  ) {
    const fallback = await supabase
      .from("campaign_leads")
      .update({ thread_id: values.threadId })
      .eq("id", campaignLeadId);

    if (fallback.error) {
      throw fallback.error;
    }

    return;
  }

  throw error;
}

function getWaitDelayMs(node: ParsedWorkflowNode): number {
  const days = Number(node.data.days);
  if (Number.isFinite(days) && days > 0) {
    return days * 86400000;
  }

  const duration = Number(node.data.duration) || 1;
  const unit = String(node.data.unit || "days");
  const unitToMs: Record<string, number> = {
    seconds: 1000,
    minutes: 60000,
    hours: 3600000,
    days: 86400000,
  };
  return duration * (unitToMs[unit] || unitToMs.days);
}

function getEmailPrompt(node: WorkflowNode): string {
  // New single-prompt field
  if (typeof node.data.prompt === "string" && node.data.prompt.trim()) {
    return node.data.prompt;
  }
  // Legacy fallback: combine old subject_prompt + body_prompt
  const parts = [
    typeof node.data.subject_prompt === "string" ? node.data.subject_prompt : "",
    typeof node.data.body_prompt === "string" ? node.data.body_prompt : "",
  ].filter(Boolean);
  if (parts.length) return parts.join(". ");
  // Last-resort fallback
  const template = typeof node.data.template === "string" ? node.data.template : "";
  return template ? `Write a ${template} outreach email` : "Write a professional outreach email";
}

interface CampaignExecutionContext {
  supabase: ReturnType<typeof getSupabase>;
  campaign: Campaign;
  campaignLead: CampaignLead;
  lead: Lead;
  productName: string;
  productDescription?: string;
  /** Combined product KB + campaign automation_context items — passed to generateMessage */
  knowledgeBaseItems: KnowledgeBaseItem[];
  threadId?: string;
  lastMessageId?: string;
  threadSubject?: string;
  labelId?: string | null;
  replied: boolean;
  /** Shared counter incremented each time an email is actually sent this sweep */
  emailCounter: { count: number };
}

const campaignHandlers: WorkflowHandlers<CampaignExecutionContext> = {
  start: async (node, context) => {
    await logAction(context.supabase, context.campaignLead.id, node.normalizedType, "success");
  },

  send_email: async (node, context) => {
    // ── Suppression check ────────────────────────────────────────────────
    const isSuppressed = await checkSuppression(context.supabase, context.lead.email);
    if (isSuppressed) {
      await logAction(context.supabase, context.campaignLead.id, "send_email", "skipped", {
        reason: "suppressed",
        email: context.lead.email,
      });
      return {}; // advance to next node without sending
    }

    const prompt = getEmailPrompt(node);
    const mode =
      typeof node.data.mode === "string" && node.data.mode === "same_for_all"
        ? "same_for_all"
        : "personalized";

    let threadId = context.threadId;
    let threadSubject = context.threadSubject;
    let lastMessageId = context.lastMessageId;

    const { sendEmail, applyLabelToMessage, applyLabelToThread } = await import("@/lib/gmail");
    const { generateMessage } = await import("@/lib/openai");

    const interpolate = (text: string) =>
      text
        .replace(/\{\{name\}\}/g, context.lead.name)
        .replace(/\{\{email\}\}/g, context.lead.email)
        .replace(/\{\{company\}\}/g, context.lead.company || "your company")
        .replace(/\{\{industry\}\}/g, context.lead.industry || "your industry");

    let subject: string;
    let htmlBody: string;
    let cacheHit = false;

    if (mode === "same_for_all") {
      const cachedSubject =
        typeof node.data.cached_subject === "string" ? node.data.cached_subject : null;
      const cachedBody =
        typeof node.data.cached_body === "string" ? node.data.cached_body : null;

      if (cachedSubject && cachedBody) {
        // Cache hit — substitute placeholders for this specific lead
        cacheHit = true;
        subject = threadSubject || interpolate(cachedSubject);
        htmlBody = interpolate(cachedBody);
      } else {
        // Cache miss — generate once, then persist it back into workflow_json
        const message = await generateMessage(prompt, null, context.productDescription, {
          senderEmail: process.env.GMAIL_USER_EMAIL,
          isFollowUp: !!threadId,
          enrichedData: context.lead.enriched_data ?? null,
          knowledgeBase: context.knowledgeBaseItems,
        });
        node.data.cached_subject = message.subject;
        node.data.cached_body = message.body;

        // Persist the cache into campaign.workflow_json in Supabase
        const updatedNodes = context.campaign.workflow_json.nodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, cached_subject: message.subject, cached_body: message.body } }
            : n
        );
        const updatedWorkflow = { ...context.campaign.workflow_json, nodes: updatedNodes };
        await context.supabase
          .from("campaigns")
          .update({ workflow_json: updatedWorkflow })
          .eq("id", context.campaign.id);
        context.campaign.workflow_json = updatedWorkflow;

        subject = threadSubject || interpolate(message.subject);
        htmlBody = interpolate(message.body);
      }
    } else {
      // Personalized — unique email per lead
      const message = await generateMessage(prompt, context.lead, context.productDescription, {
        senderEmail: process.env.GMAIL_USER_EMAIL,
        isFollowUp: !!threadId,
        enrichedData: context.lead.enriched_data ?? null,
        knowledgeBase: context.knowledgeBaseItems,
      });
      subject = threadSubject || message.subject;
      htmlBody = message.body;
    }

    // ── Compliance footer + unsubscribe URL ──────────────────────────────
    const unsubscribeUrl = buildUnsubscribeUrl(context.campaignLead.id);
    htmlBody += buildComplianceFooter(unsubscribeUrl);

    const sent = await sendEmail({
      to: context.lead.email,
      subject,
      htmlBody,
      threadId,
      replyToMessageId: lastMessageId,
      unsubscribeUrl,
    });

    threadId = sent.threadId;
    context.threadId = sent.threadId;
    threadSubject = subject;
    context.threadSubject = subject;
    lastMessageId = sent.rfcMessageId || lastMessageId;
    context.lastMessageId = lastMessageId;

    await persistThreadState(context.supabase, context.campaignLead.id, {
      threadId: sent.threadId,
      lastMessageId,
      threadSubject: subject,
    });

    if (context.labelId) {
      try {
        await applyLabelToThread(sent.threadId, context.labelId);
      } catch {
        await applyLabelToMessage(sent.messageId, context.labelId);
      }
    }

    // Increment followup_count after successful send
    await context.supabase
      .from("campaign_leads")
      .update({ followup_count: (context.campaignLead.followup_count || 0) + 1 })
      .eq("id", context.campaignLead.id);
    context.campaignLead.followup_count = (context.campaignLead.followup_count || 0) + 1;

    // Record deliverability event
    await recordDeliverabilityEvent(context.supabase, context.campaignLead.id, "sent");

    await logAction(
      context.supabase,
      context.campaignLead.id,
      "send_email",
      "success",
      {
        mode,
        cache_hit: cacheHit,
        thread_subject: threadSubject,
        thread_id: threadId,
        last_message_id: lastMessageId,
        label_id: context.labelId,
      }
    );
    // Increment the per-sweep email counter (used for rate limiting)
    context.emailCounter.count++;
  },

  send_whatsapp: async (node, context) => {
    const phone = (context.lead as Lead & { phone?: string | null }).phone;
    if (!phone) {
      await logAction(context.supabase, context.campaignLead.id, "send_whatsapp", "skipped", {
        reason: "no_phone",
        lead_id: context.lead.id,
      });
      return {};
    }

    const prompt =
      typeof node.data.prompt === "string" && node.data.prompt.trim()
        ? node.data.prompt
        : "Write a professional WhatsApp follow-up message.";

    const mode =
      typeof node.data.mode === "string" && node.data.mode === "same_for_all"
        ? "same_for_all"
        : "personalized";

    const { generateWhatsAppMessage } = await import("@/lib/openai");

    const interpolate = (text: string) =>
      text
        .replace(/\{\{name\}\}/g, context.lead.name)
        .replace(/\{\{company\}\}/g, context.lead.company || "your company")
        .replace(/\{\{industry\}\}/g, context.lead.industry || "your industry");

    let body: string;

    if (mode === "same_for_all") {
      const cachedBody = typeof node.data.cached_body === "string" ? node.data.cached_body : null;
      if (cachedBody) {
        body = interpolate(cachedBody);
      } else {
        const result = await generateWhatsAppMessage(prompt, null, context.productDescription);
        node.data.cached_body = result.body;
        const updatedNodes = context.campaign.workflow_json.nodes.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, cached_body: result.body } } : n
        );
        const updatedWorkflow = { ...context.campaign.workflow_json, nodes: updatedNodes };
        await context.supabase
          .from("campaigns")
          .update({ workflow_json: updatedWorkflow })
          .eq("id", context.campaign.id);
        context.campaign.workflow_json = updatedWorkflow;
        body = interpolate(result.body);
      }
    } else {
      const result = await generateWhatsAppMessage(prompt, context.lead, context.productDescription);
      body = result.body;
    }

    // Send via the worker's internal WhatsApp gateway
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL ?? "http://127.0.0.1:3002";
    const sendRes = await fetch(`${gatewayUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, body }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => "unknown");
      throw new Error(`WhatsApp gateway send failed: ${sendRes.status} ${errText}`);
    }

    const sent = (await sendRes.json()) as { jid: string; ts: number };

    // Persist WhatsApp state to campaign_leads
    await context.supabase
      .from("campaign_leads")
      .update({
        whatsapp_jid: sent.jid,
        whatsapp_last_msg_ts: sent.ts,
        followup_count: (context.campaignLead.followup_count || 0) + 1,
      })
      .eq("id", context.campaignLead.id);

    context.campaignLead.followup_count = (context.campaignLead.followup_count || 0) + 1;

    await logAction(
      context.supabase,
      context.campaignLead.id,
      "send_whatsapp",
      "success",
      { jid: sent.jid, ts: sent.ts, mode }
    );

    context.emailCounter.count++; // share rate-limit counter
  },

  wait: async (node, context) => {
    const delayMs = getWaitDelayMs(node);

    await logAction(context.supabase, context.campaignLead.id, "wait", "success", {
      resume_at: new Date(Date.now() + delayMs).toISOString(),
      days: node.data.days ?? null,
      duration: node.data.duration ?? null,
      unit: node.data.unit ?? null,
    });

    return { delayMs };
  },

  condition: async (node, context) => {
    const check = String(node.data.check || "replied");
    let hasReply = false;
    let replyCheckError: string | null = null;
    let usedCache = false;

    // If the DB already confirmed a reply (set by sweepRepliedLeads earlier this
    // sweep), trust it and skip the live Gmail round-trip.
    if (context.replied) {
      hasReply = true;
      usedCache = true;
    } else if (context.threadId) {
      try {
        const { hasThreadReceivedReply } = await import("@/lib/gmail");
        hasReply = await hasThreadReceivedReply(
          context.threadId,
          process.env.GMAIL_USER_EMAIL!,
          context.lead.email
        );
      } catch (error) {
        hasReply = false;
        replyCheckError = error instanceof Error ? error.message : String(error);
      }
    } else if ((context.campaignLead as CampaignLead & { whatsapp_jid?: string | null }).whatsapp_jid) {
      // WhatsApp reply check via the worker gateway
      try {
        const cl = context.campaignLead as CampaignLead & {
          whatsapp_jid?: string | null;
          whatsapp_last_msg_ts?: number | null;
        };
        const jid = cl.whatsapp_jid!;
        const since = Number(cl.whatsapp_last_msg_ts ?? 0);
        const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL ?? "http://127.0.0.1:3002";
        const checkRes = await fetch(
          `${gatewayUrl}/check-reply?jid=${encodeURIComponent(jid)}&since=${since}`
        );
        if (checkRes.ok) {
          const { replied: waReplied } = (await checkRes.json()) as { replied: boolean };
          hasReply = waReplied;
        }
      } catch (error) {
        hasReply = false;
        replyCheckError = error instanceof Error ? error.message : String(error);
      }
    }

    const replied = check === "not_replied" ? !hasReply : hasReply;
    const branch = replied ? "yes" : "no";

    if (hasReply && !usedCache) {
      context.replied = true;
      await context.supabase
        .from("campaign_leads")
        .update({ replied: true })
        .eq("id", context.campaignLead.id);
    }

    await logAction(context.supabase, context.campaignLead.id, "condition", "success", {
      check,
      result: replied,
      branch,
      used_cache: usedCache,
      thread_id: context.threadId || null,
      reply_check_error: replyCheckError,
      missing_thread_id: !context.threadId,
    });

    return { branch };
  },

  end: async (_node, context) => {
    await logAction(context.supabase, context.campaignLead.id, "end", "success");
    return { stop: true };
  },

  auto_reply: async (node, context) => {
    // ── Suppression check ────────────────────────────────────────────────
    const isSuppressed = await checkSuppression(context.supabase, context.lead.email);
    if (isSuppressed) {
      await logAction(context.supabase, context.campaignLead.id, "auto_reply", "skipped", {
        reason: "suppressed",
        email: context.lead.email,
      });
      return { branch: "unanswered" };
    }

    // ── Guard: need a thread to reply into ──────────────────────────────
    if (!context.threadId) {
      await logAction(context.supabase, context.campaignLead.id, "auto_reply", "skipped", {
        reason: "no_thread_id",
      });
      return { branch: "unanswered" };
    }

    const toneInstructions = typeof node.data.tone_prompt === "string" ? node.data.tone_prompt : "";
    const useProductCtx = node.data.use_product_context !== false;
    const useCampaignCtx = node.data.use_campaign_context !== false;

    // ── Assemble knowledge base items ────────────────────────────────────
    const contextItems: import("@/types").KnowledgeBaseItem[] = [];

    if (useProductCtx) {
      // Fetch the product's knowledge base
      const { data: productRow } = await context.supabase
        .from("products")
        .select("knowledge_base")
        .eq("id", context.campaign.product_id)
        .maybeSingle();
      const kb = productRow?.knowledge_base as import("@/types").AutomationContext | null;
      if (kb?.items?.length) contextItems.push(...kb.items);
    }

    if (useCampaignCtx) {
      const campaignCtx = context.campaign.automation_context;
      if (campaignCtx?.items?.length) contextItems.push(...campaignCtx.items);
    }

    // ── Fetch full thread ────────────────────────────────────────────────
    const { getThreadMessages } = await import("@/lib/gmail");
    const threadMessages = await getThreadMessages(context.threadId);

    // ── Ask LLM ─────────────────────────────────────────────────────────
    const { generateAutoReply } = await import("@/lib/openai");
    const result = await generateAutoReply(
      threadMessages,
      contextItems,
      undefined, // campaign description - not a dedicated field yet
      context.productDescription ?? null,
      toneInstructions,
      context.lead
    );

    if (!result.can_answer || !result.body) {
      await logAction(context.supabase, context.campaignLead.id, "auto_reply", "skipped", {
        reason: "cannot_answer",
        reasoning: result.reasoning,
        context_items_count: contextItems.length,
      });
      return { branch: "unanswered" };
    }

    // ── Send the reply ───────────────────────────────────────────────────
    const { sendEmail, applyLabelToMessage, applyLabelToThread } = await import("@/lib/gmail");
    const { buildComplianceFooter, buildUnsubscribeUrl } = await import("@/lib/compliance");

    const unsubscribeUrl = buildUnsubscribeUrl(context.campaignLead.id);
    const htmlBody = result.body + buildComplianceFooter(unsubscribeUrl);
    const subject = result.subject || `Re: ${context.threadSubject || "your message"}`;

    const sent = await sendEmail({
      to: context.lead.email,
      subject,
      htmlBody,
      threadId: context.threadId,
      replyToMessageId: context.lastMessageId,
      unsubscribeUrl,
    });

    context.threadId = sent.threadId;
    context.lastMessageId = sent.rfcMessageId || context.lastMessageId;
    context.threadSubject = context.threadSubject || subject;

    await persistThreadState(context.supabase, context.campaignLead.id, {
      threadId: sent.threadId,
      lastMessageId: context.lastMessageId,
      threadSubject: context.threadSubject,
    });

    if (context.labelId) {
      try {
        await applyLabelToThread(sent.threadId, context.labelId);
      } catch {
        await applyLabelToMessage(sent.messageId, context.labelId);
      }
    }

    await context.supabase
      .from("campaign_leads")
      .update({ followup_count: (context.campaignLead.followup_count || 0) + 1 })
      .eq("id", context.campaignLead.id);
    context.campaignLead.followup_count = (context.campaignLead.followup_count || 0) + 1;

    await recordDeliverabilityEvent(context.supabase, context.campaignLead.id, "sent");
    context.emailCounter.count++;

    await logAction(context.supabase, context.campaignLead.id, "auto_reply", "success", {
      reasoning: result.reasoning,
      context_items_count: contextItems.length,
      thread_id: sent.threadId,
      subject,
    });

    return { branch: "answered" };
  },
};

async function processCampaignLead(
  supabase: ReturnType<typeof getSupabase>,
  campaign: Campaign,
  campaignLead: CampaignLead,
  parsedWorkflow: ParsedWorkflow,
  productName: string,
  labelId: string | null,
  productDescription?: string,
  emailCounter?: { count: number },
  knowledgeBaseItems?: KnowledgeBaseItem[]
) {
  if (!campaignLead.lead) {
    throw new Error(`Lead ${campaignLead.lead_id} not loaded`);
  }

  const counter = emailCounter ?? { count: 0 };

  const outcome = await runWorkflow(
    parsedWorkflow,
    {
      supabase,
      campaign,
      campaignLead,
      lead: campaignLead.lead,
      productName,
      productDescription,
      knowledgeBaseItems: knowledgeBaseItems ?? [],
      labelId,
      threadId: campaignLead.thread_id || undefined,
      lastMessageId: campaignLead.last_message_id || undefined,
      threadSubject: campaignLead.thread_subject || undefined,
      replied: campaignLead.replied ?? false,
      emailCounter: counter,
    },
    campaignHandlers,
    {
      startNodeId: campaignLead.current_node_id || parsedWorkflow.startNodeId,
    }
  );

  const lastActionTime = new Date().toISOString();

  if (outcome.status === "waiting") {
    await supabase
      .from("campaign_leads")
      .update({
        current_node_id: outcome.currentNodeId,
        status: "waiting",
        next_action_time: outcome.waitUntil,
        last_action_time: lastActionTime,
      })
      .eq("id", campaignLead.id);
    return outcome.steps;
  }

  const nextNode = parsedWorkflow.nodesById.get(outcome.currentNodeId);
  const completed =
    nextNode?.normalizedType === "end" ||
    !parsedWorkflow.outgoingBySource.get(outcome.currentNodeId)?.length;

  await supabase
    .from("campaign_leads")
    .update({
      current_node_id: outcome.currentNodeId,
      status: completed ? "completed" : "queued",
      next_action_time: completed ? null : new Date().toISOString(),
      last_action_time: lastActionTime,
    })
    .eq("id", campaignLead.id);

  return outcome.steps;
}

/**
 * Returns how many emails were successfully sent for a campaign in the last hour.
 */
async function getEmailsSentInLastHour(
  supabase: ReturnType<typeof getSupabase>,
  campaignId: string
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  // Step 1: get all campaign_lead IDs for this campaign
  const { data: clRows } = await supabase
    .from("campaign_leads")
    .select("id")
    .eq("campaign_id", campaignId);

  if (!clRows?.length) return 0;
  const ids = clRows.map((r: { id: string }) => r.id);

  // Step 2: count matching send_email success logs in the last hour
  const { count } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .in("campaign_lead_id", ids)
    .eq("action", "send_email")
    .eq("status", "success")
    .gte("created_at", oneHourAgo);

  return count ?? 0;
}

async function sweepRepliedLeads(
  supabase: ReturnType<typeof getSupabase>
): Promise<void> {
  // Find all waiting leads that have a thread but haven't been marked as replied yet.
  // Only check leads whose next_action_time is >2 min in the future — leads due
  // imminently will have their reply checked live by the condition handler itself,
  // so we avoid a redundant Gmail API call for each one every 10 s.
  const twoMinutesFromNow = new Date(Date.now() + 2 * 60_000).toISOString();
  const { data: waitingLeads, error } = await supabase
    .from("campaign_leads")
    .select("id, thread_id, lead:leads(email)")
    .eq("status", "waiting")
    .eq("replied", false)
    .not("thread_id", "is", null)
    .gt("next_action_time", twoMinutesFromNow);

  if (error || !waitingLeads?.length) return;

  const { hasThreadReceivedReply } = await import("@/lib/gmail");
  const senderEmail = process.env.GMAIL_USER_EMAIL!;

  for (const cl of waitingLeads) {
    if (!cl.thread_id) continue;
    const leadData = cl.lead as unknown as { email: string } | null;
    try {
      const hasReply = await hasThreadReceivedReply(
        cl.thread_id,
        senderEmail,
        leadData?.email
      );
      if (hasReply) {
        // Mark as replied and accelerate — set next_action_time to now so the
        // engine picks it up in the current (or next) sweep instead of waiting
        // for the full wait-node timer to expire.
        await supabase
          .from("campaign_leads")
          .update({
            replied: true,
            next_action_time: new Date().toISOString(),
          })
          .eq("id", cl.id);
      }
    } catch {
      // Non-fatal — will be retried on the next sweep
    }
  }
}

export async function processActiveCampaigns(): Promise<{
  processed: number;
  errors: number;
}> {
  const supabase = getSupabase();
  let processed = 0;
  let errors = 0;

  // Proactively detect replies on all waiting leads so analytics reflects them
  // immediately and leads are accelerated to the front of the queue.
  await sweepRepliedLeads(supabase);

  const { data: activeCampaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", "active");

  if (campaignError || !activeCampaigns?.length) {
    return { processed: 0, errors: 0 };
  }

  // Pre-fetch products so campaigns can reuse product metadata per sweep.
  const productIds = [...new Set((activeCampaigns as Campaign[]).map((c) => c.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, knowledge_base")
    .in("id", productIds);
  const productMap = new Map<
    string,
    { name: string; description: string | null; knowledge_base: { items: KnowledgeBaseItem[] } | null }
  >(
    (products || []).map(
      (product: { id: string; name: string; description: string | null; knowledge_base: { items: KnowledgeBaseItem[] } | null }) => [
        product.id,
        { name: product.name, description: product.description, knowledge_base: product.knowledge_base },
      ]
    )
  );

  for (const campaign of activeCampaigns as Campaign[]) {
    let parsedWorkflow: ParsedWorkflow;
    try {
      parsedWorkflow = parseWorkflow(campaign.workflow_json);
    } catch (error) {
      console.error(`Invalid workflow for campaign ${campaign.id}:`, error);
      errors++;
      continue;
    }

    const product = productMap.get(campaign.product_id);
    if (!product) {
      console.error(`Missing product ${campaign.product_id} for campaign ${campaign.id}`);
      errors++;
      continue;
    }

    const productName = product.name;
    const productDescription = product.description || undefined;
    const productKbItems: KnowledgeBaseItem[] = product.knowledge_base?.items ?? [];
    const campaignKbItems: KnowledgeBaseItem[] = (campaign as Campaign & { automation_context?: { items: KnowledgeBaseItem[] } }).automation_context?.items ?? [];
    const knowledgeBaseItems: KnowledgeBaseItem[] = [...productKbItems, ...campaignKbItems];

    let labelId: string | null = null;
    try {
      labelId = await ensureCampaignLabel(supabase, campaign, productName);
    } catch (error) {
      console.error(`Failed to ensure label for campaign ${campaign.id}:`, error);
      errors++;
      continue;
    }

    // ── Rate limiting (with warm-up integration) ──────────────────────────
    const rateLimit = campaign.email_rate_limit_per_hour ?? null;
    const { limit: effectiveLimit, warmup } = await getEffectiveDailyLimit(
      supabase,
      campaign.id,
      rateLimit
    );
    let emailBudget = Infinity; // max emails to send this sweep for this campaign

    if (effectiveLimit !== Infinity && effectiveLimit > 0) {
      const sentInLastHour = await getEmailsSentInLastHour(supabase, campaign.id);
      const remaining = effectiveLimit - sentInLastHour;
      if (remaining <= 0) {
        console.log(
          `Campaign ${campaign.id}: rate limit reached (${sentInLastHour}/${effectiveLimit} per hour${warmup ? `, warmup day ${warmup.day_number}` : ""}). Skipping sweep.`
        );
        continue; // skip this campaign entirely this sweep
      }
      emailBudget = remaining;
      console.log(
        `Campaign ${campaign.id}: email budget this sweep = ${emailBudget} (${sentInLastHour}/${effectiveLimit} used${warmup ? `, warmup phase: ${warmup.phase}` : ""})`
      );
    }

    // Shared counter — send_email handler increments this
    const emailCounter = { count: 0 };
    let rateLimitHit = false;

    while (true) {
      const nowIso = new Date().toISOString();
      const { data: dueLeads, error: leadsError } = await supabase
        .from("campaign_leads")
        .select("*, lead:leads(*)")
        .eq("campaign_id", campaign.id)
        .in("status", ["queued", "waiting"])
        .lte("next_action_time", nowIso)
        .order("next_action_time", { ascending: true })
        .limit(200);

      if (leadsError || !dueLeads?.length) {
        break;
      }

      for (const campaignLead of dueLeads as CampaignLead[]) {
        // Check budget before picking up next lead
        if (emailCounter.count >= emailBudget) {
          rateLimitHit = true;
          break;
        }

        try {
          const claimed = await claimCampaignLead(supabase, campaignLead.id);
          if (!claimed) {
            continue;
          }

          processed += await processCampaignLead(
            supabase,
            campaign,
            campaignLead,
            parsedWorkflow,
            productName,
            labelId,
            productDescription,
            emailCounter,
            knowledgeBaseItems
          );
        } catch (error) {
          console.error(`Error processing campaign_lead ${campaignLead.id}:`, error);

          // Classify bounce type for deliverability tracking
          const bounceType = classifyBounceType(error);
          if (bounceType) {
            await recordDeliverabilityEvent(supabase, campaignLead.id, bounceType, {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          await markFailed(
            supabase,
            campaignLead.id,
            error instanceof Error ? error.message : String(error)
          );
          errors++;
        }
      }

      if (rateLimitHit || dueLeads.length < 200) {
        break;
      }
    }

    const { data: remainingLeads } = await supabase
      .from("campaign_leads")
      .select("id")
      .eq("campaign_id", campaign.id)
      .in("status", ["queued", "waiting", "active"]);

    if (!remainingLeads?.length) {
      await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaign.id);
    }

    // Advance warm-up schedule (once per engine tick per campaign)
    try {
      await advanceWarmupDay(supabase, campaign.id);
    } catch (err) {
      console.error(`Failed to advance warmup for campaign ${campaign.id}:`, err);
    }
  }

  return { processed, errors };
}
