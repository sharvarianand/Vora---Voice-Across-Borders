import type { NextConfig } from "next";
import { withLingo } from "@lingo.dev/compiler/next";
import type { LocaleCode } from "lingo.dev/spec";

const configuredTargetLocales: LocaleCode[] = ["es", "fr", "de", "hi"];
const localeCookieName = "vora_locale";
const hasLingoApiKey = Boolean(
  process.env.LINGODOTDEV_API_KEY || process.env.LINGO_API_KEY
);
const targetLocales =
  process.env.NODE_ENV === "production" && !hasLingoApiKey
    ? []
    : configuredTargetLocales;
const models =
  process.env.NODE_ENV === "production" && !hasLingoApiKey ? {} : "lingo.dev";
const buildMode =
  process.env.NODE_ENV === "production" && !hasLingoApiKey
    ? "cache-only"
    : "translate";
const usePseudotranslator =
  process.env.LINGO_USE_PSEUDOTRANSLATOR === "true" || !hasLingoApiKey;

const nextConfig: NextConfig = {
  output: "standalone",
};

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
