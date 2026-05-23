import fs from "fs";
import path from "path";
import type { NextConfig } from "next";
import { withLingo } from "@lingo.dev/compiler/next";
import type { LocaleCode } from "lingo.dev/spec";

// Ensure lingo.dev metadata directories exist before the compiler initializes
// its LMDB database. Without this, builds fail on platforms like Vercel where
// these directories are not present (ENOENT lstat lingo/metadata-build/data.mdb).
for (const dir of ["lingo/metadata-build", "lingo/metadata-dev"]) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

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

// Always use cache-only mode in production: relies on committed lingo/cache/*.json
// files and avoids LMDB metadata writes at build time, which otherwise fail on
// Vercel because lmdb native bindings are not built there.
const buildMode = isProduction ? "cache-only" : "translate";

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
