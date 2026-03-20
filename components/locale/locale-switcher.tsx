"use client";

import { useTransition } from "react";
import { useLingoContext } from "@lingo.dev/compiler/react";
import type { LocaleCode } from "lingo.dev/spec";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LOCALES, getLocaleMeta, toFlagEmoji, getLocaleCookieName } from "@/lib/lingo";

import { useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, setLocale, isLoading } = useLingoContext();
  const [isPending, startTransition] = useTransition();
  const currentLocale = getLocaleMeta(locale) ?? SUPPORTED_LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading || isPending}>
          {isLoading || isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Languages className="mr-2 h-4 w-4" />
          )}
          {toFlagEmoji(currentLocale.flag)} {currentLocale.code.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((option) => (
          <DropdownMenuItem
            key={option.code}
            disabled={option.code === locale}
            onClick={() => {
              startTransition(async () => {
                await setLocale(option.code as LocaleCode);
                
                // Manually set the cookie with robust attributes for production (GCP)
                const cookieName = getLocaleCookieName();
                const maxAge = 60 * 60 * 24 * 365;
                const isProd = process.env.NODE_ENV === "production";
                document.cookie = `${cookieName}=${option.code}; Path=/; Max-Age=${maxAge}; SameSite=Lax${isProd ? "; Secure" : ""}`;
                
                router.refresh();
              });
            }}
          >
            {toFlagEmoji(option.flag)} {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
