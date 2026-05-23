"use client";

import type { ReactNode } from "react";
import type { LocaleCode } from "lingo.dev/spec";
import { LingoProvider } from "@lingo.dev/compiler/react/next";

type Props = {
  initialLocale: LocaleCode;
  initialTranslations?: Record<string, string>;
  devWidget?: { enabled?: boolean };
  children: ReactNode;
};

/**
 * Client-side LingoProvider wrapper.
 *
 * Importing `@lingo.dev/compiler/react/next` from a "use client" module
 * resolves to the client build, which (unlike the RSC build) honors the
 * `initialTranslations` prop instead of re-fetching with empty hashes.
 *
 * Layout reads the locale cache file on the server and passes the full
 * dictionary here so SSR renders the page already translated.
 */
export default function LingoClientProvider({
  initialLocale,
  initialTranslations,
  devWidget,
  children,
}: Props) {
  return (
    <LingoProvider
      initialLocale={initialLocale}
      initialTranslations={initialTranslations}
      devWidget={devWidget}
    >
      {children}
    </LingoProvider>
  );
}
