import type { Metadata } from "next";
import { getServerLocale } from "@lingo.dev/compiler/virtual/locale/server";
import { Geist, Geist_Mono, Inter, Bebas_Neue } from "next/font/google";
import { promises as fs } from "fs";
import path from "path";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import LingoClientProvider from "@/components/lingo/LingoClientProvider";

import GSAPProvider from "@/providers/GSAPProvider";
import LenisProvider from "@/providers/LenisProvider";
import "./globals.css";

async function loadLingoDictionary(
  locale: string
): Promise<Record<string, string>> {
  const candidatePaths = [
    path.join(process.cwd(), "lingo", "cache", `${locale}.json`),
    path.join(process.cwd(), ".lingo", "cache", `${locale}.json`),
    path.join(process.cwd(), ".next", `${locale}.json`),
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as { entries?: Record<string, string> };
      if (parsed?.entries && typeof parsed.entries === "object") {
        return parsed.entries;
      }
    } catch {
      // try next candidate
    }
  }
  return {};
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vora --voice across borders",
  description: "AI-powered outreach automation platform",
  icons: {
    icon: [{ url: "/vora_logo.png", type: "image/png" }],
    shortcut: "/vora_logo.png",
    apple: "/vora_logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const initialTranslations = await loadLingoDictionary(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${bebasNeue.variable} font-sans antialiased`}
      >
        <LingoClientProvider
          initialLocale={locale}
          initialTranslations={initialTranslations}
          devWidget={{ enabled: false }}
        >
          <GSAPProvider>
            <LenisProvider>
              <ThemeProvider>
                {children}
                <Toaster />
              </ThemeProvider>
            </LenisProvider>
          </GSAPProvider>
        </LingoClientProvider>
      </body>
    </html>
  );
}
