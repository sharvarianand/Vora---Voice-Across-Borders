import fs from "fs";
import path from "path";
import { createRequire } from "module";
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

async function ensureLingoMetadataBuildDb() {
  const metadataDir = path.join(process.cwd(), "lingo", "metadata-build");
  const dataFile = path.join(metadataDir, "data.mdb");

  if (fs.existsSync(dataFile)) return;

  fs.mkdirSync(metadataDir, { recursive: true });

  const require = createRequire(import.meta.url);
  const nextPluginPath = require.resolve("@lingo.dev/compiler/next");
  const compilerRoot = path.resolve(path.dirname(nextPluginPath), "..", "..");
  const compilerRequire = createRequire(path.join(compilerRoot, "package.json"));
  const lmdbPath = compilerRequire.resolve("lmdb");
  const lmdb = (await import(lmdbPath)) as {
    open: (options: {
      path: string;
      compression: boolean;
      noSync: boolean;
    }) => {
      transactionSync: (callback: () => void) => void;
      close: () => Promise<void>;
    };
  };

  const db = lmdb.open({
    path: metadataDir,
    compression: true,
    noSync: true,
  });

  try {
    db.transactionSync(() => {});
  } finally {
    await db.close();
  }
}

const nextConfig: NextConfig = {
  compiler: {
    runAfterProductionCompile: ensureLingoMetadataBuildDb,
  },
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
