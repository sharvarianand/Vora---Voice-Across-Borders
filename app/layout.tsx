import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inter, Bebas_Neue } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

import GSAPProvider from "@/providers/GSAPProvider";
import LenisProvider from "@/providers/LenisProvider";
import "./globals.css";

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

const clerkAppearance = {
  variables: {
    colorPrimary: "#D72323",
    colorBackground: "#121012",
    colorText: "#F5EDED",
    colorTextSecondary: "rgba(245, 237, 237, 0.68)",
    colorInputBackground: "#1d181d",
    colorInputText: "#F5EDED",
    colorNeutral: "#4A4040",
    colorDanger: "#ef4444",
    borderRadius: "14px",
  },
  elements: {
    rootBox: "w-full",
    card: "w-full border border-white/8 bg-transparent shadow-none",
    cardBox: "w-full shadow-none",
    headerTitle: "text-[#F5EDED]",
    headerSubtitle: "text-[#F5EDED]/65",
    socialButtonsBlockButton:
      "border border-white/10 bg-white/4 text-[#F5EDED] shadow-none hover:bg-white/8",
    formButtonPrimary:
      "bg-[#D72323] text-[#F5EDED] shadow-none hover:bg-[#b61d1d]",
    formFieldInput:
      "border border-white/10 bg-[#1d181d] text-[#F5EDED] shadow-none focus:border-[#D72323] focus:ring-0",
    formFieldLabel: "text-[#F5EDED]/80",
    footerActionText: "text-[#F5EDED]/55",
    footerActionLink: "text-[#D72323] hover:text-[#F5EDED]",
    dividerText: "text-[#F5EDED]/45",
    dividerLine: "bg-white/8",
    identityPreviewText: "text-[#F5EDED]",
    formResendCodeLink: "text-[#D72323]",
    otpCodeFieldInput:
      "border border-white/10 bg-[#1d181d] text-[#F5EDED] shadow-none",
    alertText: "text-[#F5EDED]",
  },
};

export const metadata: Metadata = {
  title: "Vora --voice across borders",
  description: "AI-powered outreach automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${bebasNeue.variable} font-sans antialiased`}
        >
          <GSAPProvider>
            <LenisProvider>
              <ThemeProvider>
                {children}
                <Toaster />
              </ThemeProvider>
            </LenisProvider>
          </GSAPProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
