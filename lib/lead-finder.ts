import Exa from "exa-js";
import type { Product } from "@/types";
import { generateModelJson } from "@/lib/openai";

async function generateJson<T>(args: { system: string; user: string }): Promise<T> {
  const parsed = await generateModelJson<T>({
    system: args.system,
    user: args.user,
    temperature: 0.2,
  });
  return parsed;
}

export interface CandidateLead {
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  job_title: string | null;
  source_url: string | null;
}

interface ExaSearchResult {
  title?: string | null;
  url?: string | null;
  text?: string | null;
  highlights?: string[] | null;
}

export async function findLeads(
  userQuery: string,
  product: Pick<Product, "name" | "description">
): Promise<CandidateLead[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.warn("EXA_API_KEY not set — skipping Exa search");
    return [];
  }

  const exa = new Exa(apiKey);

  const productContext = [product.name, product.description]
    .filter(Boolean)
    .join(" — ");

  // Optimize query for People search as per Exa guide (describe what they work on)
  const searchQuery = productContext
    ? `${userQuery} relevant to ${productContext}`
    : userQuery;

  try {
    const exaResults = await exa.searchAndContents(searchQuery, {
      type: "auto",
      numResults: 10,
      category: "people",
      highlights: { "maxCharacters": 4000 }
    });

    if (!exaResults.results || exaResults.results.length === 0) {
      return [];
    }

    const searchContext = exaResults.results
      .map((r) => {
        const result = r as ExaSearchResult;
        return `**${result.title || "Untitled"}** (${result.url || ""})\n${result.highlights?.join("\n") || result.text || ""}`;
      })
      .join("\n\n---\n\n");

    const systemInstruction = `You are a B2B lead extraction assistant. Given web search results, extract individual people who could be sales leads.

Product being sold: ${product.name}${product.description ? ` — ${product.description}` : ""}
User's search intent: ${userQuery}

Return a JSON object with this exact shape:
{
  "leads": [
    {
      "name": "Full Name",
      "email": "",
      "company": "Company name or null",
      "industry": "Industry or null",
      "job_title": "Job title or null",
      "source_url": "URL where this person was found or null"
    }
  ]
}

Rules:
- Extract real, named individuals only — no generic job roles without a name
- If an email is found in the page, include it; otherwise leave it as empty string ""
- Include the source URL from the search result where the person was found
- If no relevant leads are found, return { "leads": [] }
- Do not hallucinate data — only extract what is present in the search results`;

    const parsed = await generateJson<{ leads: CandidateLead[] }>({
      system: systemInstruction,
      user: `Web search results:\n\n${searchContext}`,
    });
    return Array.isArray(parsed.leads) ? parsed.leads : [];
  } catch (err) {
    console.error("Lead extraction failed:", err);
    return [];
  }
}
