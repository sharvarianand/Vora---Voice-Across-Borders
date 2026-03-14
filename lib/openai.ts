import { AzureOpenAI } from "openai";
import type { Lead, EnrichedLeadData, KnowledgeBaseItem, ThreadMessage } from "@/types";

const ai = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
  apiKey: process.env.AZURE_OPENAI_API_KEY || "",
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2023-05-15",
});

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";

/**
 * Converts an array of KnowledgeBaseItem into a human-readable block that can
 * be embedded verbatim inside an LLM system prompt.
 */
function serializeKbItems(items: KnowledgeBaseItem[]): string {
  const lines: string[] = [];
  for (const item of items) {
    if (item.type === "faq" && item.question && item.answer) {
      lines.push(`Q: ${item.question}\nA: ${item.answer}`);
    } else if (item.type === "text" && item.content) {
      const header = item.label ? `[${item.label}]` : "[Context]";
      lines.push(`${header}\n${item.content}`);
    }
  }
  return lines.join("\n\n");
}

/**
 * Generate an email subject and plain-text body from a single natural-language prompt.
 */
export async function generateMessage(
  prompt: string,
  lead: Lead | null,
  productDescription?: string,
  options?: { senderEmail?: string; isFollowUp?: boolean; enrichedData?: EnrichedLeadData | null; knowledgeBase?: KnowledgeBaseItem[] }
): Promise<{ subject: string; body: string }> {
  const effectivePrompt = lead
    ? prompt
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{email\}\}/g, lead.email)
        .replace(/\{\{company\}\}/g, lead.company || "your company")
        .replace(/\{\{industry\}\}/g, lead.industry || "your industry")
    : prompt;

  const personalizationInstruction = lead
    ? `Recipient: ${lead.name} at ${lead.company || "unknown company"} in ${
        lead.industry || "unknown industry"
      }. Personalise the email specifically for them.`
    : "Write the email as a reusable template. Wherever you would reference the recipient's name, company, or industry, use the exact literal placeholders {{name}}, {{company}}, and {{industry}} instead of real values. Do NOT invent specific names or companies.";

  const senderEmail = options?.senderEmail;
  const isFollowUp = options?.isFollowUp ?? false;
  const enrichedData = options?.enrichedData;
  const knowledgeBase = options?.knowledgeBase;

  const kbSerialized = knowledgeBase?.length ? serializeKbItems(knowledgeBase) : "";
  const knowledgeBaseInstruction = kbSerialized
    ? `\n\nKNOWLEDGE BASE (authoritative facts about this product and campaign — weave in relevant details naturally when they strengthen the email; never recite them as a list):\n${kbSerialized}`
    : "";

  const enrichmentInstruction = enrichedData && enrichedData.personalization_hooks.length > 0
    ? `\n\nEnriched lead intelligence (scraped from the web — use these to make the email feel personal and deeply researched):\n` +
      (enrichedData.job_title ? `- Job title: ${enrichedData.job_title}\n` : "") +
      (enrichedData.bio ? `- Bio: ${enrichedData.bio}\n` : "") +
      (enrichedData.company_description ? `- Company: ${enrichedData.company_description}\n` : "") +
      (enrichedData.recent_news ? `- Recent news: ${enrichedData.recent_news}\n` : "") +
      (enrichedData.pain_points?.length ? `- Likely pain points: ${enrichedData.pain_points.join(", ")}\n` : "") +
      `- Personalization hooks to weave in: ${enrichedData.personalization_hooks.join(" | ")}\n` +
      `Reference 1-2 of these hooks naturally — do NOT list them verbatim. Make the email feel like you did your homework.`
    : "";

  const senderInstruction = senderEmail
    ? `You are writing on behalf of ${senderEmail}. When signing off, use the name derived from that email address — never write placeholder text like [Your Name], [Sender], or similar.`
    : "Never write placeholder text like [Your Name] or [Sender] in the sign-off.";

  const followUpInstruction = isFollowUp
    ? "This is a follow-up email in an ongoing thread — the recipient has not replied yet. Keep it short (2-3 sentences), reference the previous outreach briefly, and add urgency or a new angle based on the instructions below. Do NOT write a cold introduction."
    : "This is the first email in an outreach sequence.";

  const systemInstruction = 
    "You are an expert B2B outreach copywriter. " +
    (productDescription ? `The product being promoted is: ${productDescription}. ` : "") +
    `${senderInstruction} ` +
    `${followUpInstruction} ` +
    "Based on the user's instructions, generate both a subject line and an email body. " +
    'Respond with JSON: {"subject": "...", "body": "..."}. ' +
    "The body must be plain text only — absolutely no HTML tags, no markdown, no bullet symbols, no em-dashes used as bullets. " +
    "Write the way a real person writes an email: short paragraphs separated by blank lines, natural conversational tone, no formal sign-off boilerplate. " +
    "Keep it concise (3-5 sentences max unless the prompt specifies otherwise). " +
    "End with a simple, direct call-to-action on its own line." +
    knowledgeBaseInstruction +
    enrichmentInstruction;

  const response = await ai.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `${effectivePrompt}\n\n${personalizationInstruction}` }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from Azure OpenAI");
  }

  const parsed = JSON.parse(content) as { subject: string; body: string };
  return {
    subject: parsed.subject,
    body: parsed.body,
  };
}

export interface AutoReplyResult {
  can_answer: boolean;
  subject: string | null;
  body: string | null;
  reasoning: string;
}

export async function generateAutoReply(
  threadMessages: ThreadMessage[],
  contextItems: KnowledgeBaseItem[],
  campaignDescription: string | null | undefined,
  productDescription: string | null | undefined,
  toneInstructions: string,
  lead: Lead
): Promise<AutoReplyResult> {
  const kbBlock = contextItems.length
    ? serializeKbItems(contextItems)
    : "(no knowledge base provided)";

  const threadBlock = threadMessages
    .map((m) => {
      const role = m.isOutbound ? "US" : "LEAD";
      return `[${role}] ${m.date}\n${m.body.slice(0, 800)}`;
    })
    .join("\n\n---\n\n");

  const systemInstruction = [
    "You are an AI assistant that handles B2B email replies on behalf of a sales team.",
    productDescription ? `Product: ${productDescription}` : null,
    campaignDescription ? `Campaign goal: ${campaignDescription}` : null,
    "Your task: decide if you can FULLY answer the lead's latest message using ONLY the knowledge base below.",
    "Rules:",
    "- Set can_answer=true ONLY if every part of the question is clearly answered in the knowledge base.",
    "- Never guess, invent, or assume details not found in the knowledge base.",
    "- If the question is only partially answerable, set can_answer=false.",
    "- If can_answer=true, write a professional reply email body (HTML).",
    toneInstructions ? `Tone instructions: ${toneInstructions}` : null,
    `Recipient name: ${lead.name} (use this to personalise the greeting).`,
    'Respond with JSON: {"can_answer": true|false, "subject": "<subject or null>", "body": "<html reply or null>", "reasoning": "<1-2 sentence explanation>"}',
    "If can_answer=false, set subject and body to null.",
    "",
    "KNOWLEDGE BASE:",
    kbBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await ai.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `EMAIL THREAD (latest last):\n\n${threadBlock}\n\nShould I auto-reply?` }
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error("No response from Azure OpenAI for auto-reply");

  const parsed = JSON.parse(raw) as {
    can_answer: boolean;
    subject?: string | null;
    body?: string | null;
    reasoning?: string;
  };

  return {
    can_answer: Boolean(parsed.can_answer),
    subject: parsed.subject ?? null,
    body: parsed.body ?? null,
    reasoning: parsed.reasoning ?? "",
  };
}

export async function generateWhatsAppMessage(
  prompt: string,
  lead: Lead | null,
  productDescription?: string
): Promise<{ body: string }> {
  const effectivePrompt = lead
    ? prompt
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{email\}\}/g, lead.email)
        .replace(/\{\{company\}\}/g, lead.company || "your company")
        .replace(/\{\{industry\}\}/g, lead.industry || "your industry")
    : prompt;

  const personalizationInstruction = lead
    ? `Recipient: ${lead.name} at ${lead.company || "unknown company"}. Personalise for them.`
    : "Write as a reusable template. Use {{name}}, {{company}}, {{industry}} as literal placeholders.";

  const systemInstruction = 
    "You are an expert B2B outreach copywriter writing a WhatsApp message. " +
    (productDescription ? `Product: ${productDescription}. ` : "") +
    `${personalizationInstruction} ` +
    "Keep it concise (ideally under 300 characters, never more than 600). " +
    "Plain text only — no HTML, no markdown, no bullet symbols. Conversational tone. " +
    'Respond with JSON: {"body": "..."}';

  const response = await ai.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: effectivePrompt }
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as { body?: string };
    return { body: parsed.body?.trim() || "Hi {{name}}, following up — would love to connect." };
  } catch {
    return { body: "Hi, just following up — would love to connect." };
  }
}
