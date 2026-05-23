import type { NextConfig } from "next";
import { withLingo } from "@lingo.dev/compiler/next";
import type { LocaleCode } from "lingo.dev/spec";

const configuredTargetLocales: LocaleCode[] = ["es", "fr", "de", "hi"];
const localeCookieName = "vora_locale";
const hasLingoApiKey = Boolean(
  process.env.LINGODOTDEV_API_KEY || process.env.LINGO_API_KEY
);
const isProduction = process.env.NODE_ENV === "production";

// Always expose configured locales so production can serve cached translations
// even when the API key is not available (buildMode: cache-only).
const targetLocales = configuredTargetLocales;

// Only use hosted model when an API key is available.
const models = hasLingoApiKey ? "lingo.dev" : {};

// In production without an API key we should rely on cached translations only.
const buildMode = !hasLingoApiKey && isProduction ? "cache-only" : "translate";

// Pseudotranslation is useful for local/dev without an API key, but should not
// turn on automatically in production.
const usePseudotranslator =
  process.env.LINGO_USE_PSEUDOTRANSLATOR === "true" || (!hasLingoApiKey && !isProduction);

const nextConfig: NextConfig = {};

export default withLingo(nextConfig, {
  sourceRoot: ".",
  sourceLocale: "en",
  targetLocales,
  models,
  buildMode,
  dev: {
    usePseudotranslator,
  },
  localePersistence: {
    type: "cookie",
    config: {
      name: localeCookieName,
      maxAge: 60 * 60 * 24 * 365,
    },
  },
});
