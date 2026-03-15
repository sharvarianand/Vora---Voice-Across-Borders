import "server-only";

import { LingoDotDevEngine } from "lingo.dev/sdk";
import type { LocaleCode } from "lingo.dev/spec";
import { DEFAULT_LOCALE } from "@/lib/lingo";

const PLACEHOLDER_PATTERN = /\{\{[^}]+\}\}/g;

let engine: LingoDotDevEngine | null | undefined;

function getLingoEngine() {
  if (engine !== undefined) return engine;

  const apiKey = process.env.LINGO_API_KEY || process.env.LINGODOTDEV_API_KEY;
  engine = apiKey ? new LingoDotDevEngine({ apiKey }) : null;
  return engine;
}

function freezePlaceholders(text: string) {
  const placeholders: string[] = [];
  const frozen = text.replace(PLACEHOLDER_PATTERN, (match) => {
    const token = `__VORA_TOKEN_${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });

  return { frozen, placeholders };
}

function restorePlaceholders(text: string, placeholders: string[]) {
  return placeholders.reduce(
    (current, placeholder, index) =>
      current.replaceAll(`__VORA_TOKEN_${index}__`, placeholder),
    text
  );
}

async function localizeTextInternal(
  text: string,
  targetLocale: LocaleCode,
  kind: "text" | "html"
) {
  if (!text.trim() || targetLocale === DEFAULT_LOCALE) {
    return text;
  }

  const lingo = getLingoEngine();
  if (!lingo) {
    return text;
  }

  const { frozen, placeholders } = freezePlaceholders(text);

  try {
    const localized =
      kind === "html"
        ? await lingo.localizeHtml(frozen, {
            sourceLocale: DEFAULT_LOCALE,
            targetLocale,
            fast: true,
          })
        : await lingo.localizeText(frozen, {
            sourceLocale: DEFAULT_LOCALE,
            targetLocale,
            fast: true,
          });

    return restorePlaceholders(localized, placeholders);
  } catch (error) {
    console.error(`Lingo localization failed for ${targetLocale}:`, error);
    return text;
  }
}

export async function localizePlainText(text: string, targetLocale: LocaleCode | null | undefined) {
  if (!targetLocale) return text;
  return localizeTextInternal(text, targetLocale, "text");
}

export async function localizeHtmlText(text: string, targetLocale: LocaleCode | null | undefined) {
  if (!targetLocale) return text;
  return localizeTextInternal(text, targetLocale, "html");
}

export async function localizeEmailContent(
  content: { subject: string; body: string },
  targetLocale: LocaleCode | null | undefined
) {
  if (!targetLocale || targetLocale === DEFAULT_LOCALE) {
    return content;
  }

  const [subject, body] = await Promise.all([
    localizePlainText(content.subject, targetLocale),
    localizePlainText(content.body, targetLocale),
  ]);

  return { subject, body };
}
