import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getLeadLocale,
  normalizeLocale,
} from "@/lib/lingo";
import { localizeEmailContent, localizeHtmlText, localizePlainText } from "@/lib/lingo-server";
import type { Lead, EnrichedLeadData, KnowledgeBaseItem, ThreadMessage } from "@/types";

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

type ModelJsonArgs = {
  system: string;
  user: string;
  temperature?: number;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

function safeParseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Fallback: extract the first JSON object substring.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Model returned non-JSON response");
  }
}

function hasAzureOpenAiConfig(): boolean {
  return Boolean(
    (process.env.AZURE_OPENAI_API_KEY || "").trim() &&
      (process.env.AZURE_OPENAI_BASE_URL || process.env.AZURE_OPENAI_ENDPOINT || "").trim() &&
      ((process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "").trim() ||
        (process.env.AZURE_OPENAI_MODEL || "").trim())
  );
}

async function generateGeminiJson<T>(args: ModelJsonArgs): Promise<T> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `${args.system}\n\nUSER:\n${args.user}` }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: args.temperature ?? 0.7,
    },
  });

  const text = result.response.text();
  return safeParseJson<T>(text);
}

async function generateAzureJson<T>(args: ModelJsonArgs): Promise<T> {
  const apiKey = (process.env.AZURE_OPENAI_API_KEY || "").trim();
  const deployment =
    (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "").trim() ||
    (process.env.AZURE_OPENAI_MODEL || "").trim() ||
    "gpt-4o-mini";
  const baseUrl = (process.env.AZURE_OPENAI_BASE_URL || "").trim();
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").trim();
  const urlBase = baseUrl || endpoint;
  if (!apiKey || !urlBase || !deployment) {
    throw new Error("Missing AZURE_OPENAI_* configuration");
  }

  // This assumes the configured base URL is OpenAI-compatible (e.g. ends with /openai/v1).
  // If you're using the Azure deployments-style endpoint, set AZURE_OPENAI_BASE_URL accordingly.
  const url = `${urlBase.replace(/\/+$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      model: deployment,
      temperature: args.temperature ?? 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Azure OpenAI error ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 500)}` : ""}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("Azure OpenAI returned empty response");
  }
  return safeParseJson<T>(content);
}

export async function generateModelJson<T>(args: ModelJsonArgs): Promise<T> {
  // If Azure is configured, try it first.
  if (hasAzureOpenAiConfig()) {
    try {
      return await generateAzureJson<T>(args);
    } catch (error) {
      console.warn("Azure OpenAI failed, falling back to Gemini:", error);
      // Fall through to Gemini below.
    }
  }

  // Use Gemini as the default or fallback.
  return generateGeminiJson<T>(args);
}

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
  options?: {
    senderEmail?: string;
    isFollowUp?: boolean;
    enrichedData?: EnrichedLeadData | null;
    knowledgeBase?: KnowledgeBaseItem[];
    targetLocale?: string | null;
  }
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

  const parsed = await generateModelJson<{ subject: string; body: string }>({
    system: systemInstruction,
    user: `${effectivePrompt}\n\n${personalizationInstruction}`,
    temperature: 0.7,
  });
  return localizeEmailContent(
    {
      subject: parsed.subject,
      body: parsed.body,
    },
    resolveTargetLocale(lead, options?.targetLocale)
  );
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

  const parsed = await generateModelJson<{
    can_answer: boolean;
    subject?: string | null;
    body?: string | null;
    reasoning?: string;
  }>({
    system: systemInstruction,
    user: `EMAIL THREAD (latest last):\n\n${threadBlock}\n\nShould I auto-reply?`,
    temperature: 0.2,
  });

  const targetLocale = getLeadLocale(lead);
  const [subject, body, reasoning] = await Promise.all([
    parsed.subject ? localizePlainText(parsed.subject, targetLocale) : Promise.resolve(null),
    parsed.body ? localizeHtmlText(parsed.body, targetLocale) : Promise.resolve(null),
    parsed.reasoning ? localizePlainText(parsed.reasoning, targetLocale) : Promise.resolve(""),
  ]);

  return {
    can_answer: Boolean(parsed.can_answer),
    subject,
    body,
    reasoning,
  };
}

function resolveTargetLocale(lead: Lead | null, targetLocale?: string | null) {
  return normalizeLocale(targetLocale) ?? getLeadLocale(lead);
}

export async function generateWhatsAppMessage(
  prompt: string,
  lead: Lead | null,
  productDescription?: string,
  options?: { targetLocale?: string | null }
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

  try {
    const parsed = await generateModelJson<{ body?: string }>({
      system: systemInstruction,
      user: effectivePrompt,
      temperature: 0.6,
    });
    const body = parsed.body?.trim() || "Hi {{name}}, following up — would love to connect.";
    return {
      body: await localizePlainText(body, resolveTargetLocale(lead, options?.targetLocale)),
    };
  } catch {
    return {
      body: await localizePlainText(
        "Hi, just following up — would love to connect.",
        resolveTargetLocale(lead, options?.targetLocale)
      ),
    };
  }
}
