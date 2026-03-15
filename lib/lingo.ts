import type { LocaleCode } from "lingo.dev/spec";
import type { Lead } from "@/types";

export const DEFAULT_LOCALE: LocaleCode = "en";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", flag: "US" },
  { code: "es", label: "Spanish", flag: "ES" },
  { code: "fr", label: "French", flag: "FR" },
  { code: "de", label: "German", flag: "DE" },
  { code: "hi", label: "Hindi", flag: "IN" },
] as const satisfies ReadonlyArray<{
  code: LocaleCode;
  label: string;
  flag: string;
}>;

export const TARGET_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale.code !== DEFAULT_LOCALE
).map((locale) => locale.code);

const LANGUAGE_ALIASES: Record<string, LocaleCode> = {
  english: "en",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  spanish: "es",
  espanol: "es",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  french: "fr",
  francais: "fr",
  fr: "fr",
  "fr-fr": "fr",
  german: "de",
  deutsch: "de",
  de: "de",
  "de-de": "de",
  hindi: "hi",
  hi: "hi",
  "hi-in": "hi",
};

const COUNTRY_ALIASES: Record<string, LocaleCode> = {
  us: "en",
  usa: "en",
  "united states": "en",
  uk: "en",
  "united kingdom": "en",
  england: "en",
  canada: "en",
  australia: "en",
  spain: "es",
  mexico: "es",
  argentina: "es",
  colombia: "es",
  france: "fr",
  germany: "de",
  india: "hi",
};

export function getLocaleCookieName() {
  return "vora_locale";
}

export function getLocaleMeta(locale: string | null | undefined) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return null;

  return SUPPORTED_LOCALES.find((item) => item.code === normalized) ?? null;
}

export function normalizeLocale(locale: string | null | undefined): LocaleCode | null {
  if (!locale) return null;

  const normalized = locale.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[normalized];
  }

  const base = normalized.split("-")[0];
  if (base in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[base];
  }

  return null;
}

function normalizeCountry(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}

function extractLeadFieldValue(
  lead: Lead | null | undefined,
  keys: string[]
): string | null {
  if (!lead?.custom_fields) return null;

  for (const [rawKey, rawValue] of Object.entries(lead.custom_fields)) {
    if (typeof rawValue !== "string") continue;
    const key = rawKey.trim().toLowerCase();
    if (keys.includes(key)) {
      const value = rawValue.trim();
      if (value) return value;
    }
  }

  return null;
}

export function getLeadLocale(lead: Lead | null | undefined): LocaleCode | null {
  const explicitLocale = extractLeadFieldValue(lead, [
    "locale",
    "language",
    "preferred_language",
    "preferred locale",
    "preferred_locale",
    "lang",
  ]);

  const normalizedLocale = normalizeLocale(explicitLocale);
  if (normalizedLocale) return normalizedLocale;

  const country = normalizeCountry(
    extractLeadFieldValue(lead, ["country", "country_code", "countrycode", "nationality"])
  );

  if (country && country in COUNTRY_ALIASES) {
    return COUNTRY_ALIASES[country];
  }

  return null;
}

export function toFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
