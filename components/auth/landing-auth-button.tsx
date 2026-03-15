"use client";

import { type CSSProperties, type ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignIn, SignUp, useAuth } from "@clerk/nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LandingAuthButtonProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  dashboardHref?: string;
  defaultView?: "sign-in" | "sign-up";
};

export function LandingAuthButton({
  children,
  className,
  style,
  dashboardHref = "/dashboard",
  defaultView = "sign-in",
}: LandingAuthButtonProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"sign-in" | "sign-up">(defaultView);
  const [isOpen, setIsOpen] = useState(false);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !wasSignedIn.current && isOpen) {
      router.replace(dashboardHref);
    }
    if (isLoaded) {
      wasSignedIn.current = isSignedIn;
    }
  }, [isLoaded, isSignedIn, isOpen, router, dashboardHref]);

  if (isSignedIn) {
    return (
      <Link href={dashboardHref} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setView(defaultView);
        }
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={className} style={style}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[960px] overflow-hidden border-white/10 bg-[#0b0b0d]/95 p-0 text-white shadow-2xl backdrop-blur-xl sm:max-w-4xl"
        showCloseButton={false}
      >
        <div className="grid min-h-[680px] grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex flex-col justify-between border-r border-white/8 bg-[radial-gradient(circle_at_top,_rgba(215,35,35,0.22),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-8">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#f5eded]/75">
                Vora Access
              </div>
              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-3xl font-semibold tracking-tight text-[#f5eded]">
                  {view === "sign-in" ? "Welcome back" : "Create your workspace"}
                </DialogTitle>
                <DialogDescription className="max-w-sm text-sm leading-6 text-[#f5eded]/65">
                  Authenticate without leaving the landing page. The auth panel is styled to match the same dark product surface used across Vora.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="mb-2 text-sm font-medium text-[#f5eded]">Why this flow</div>
                <p className="text-sm leading-6 text-[#f5eded]/60">
                  No auth route jump, no full-page context switch. Users stay on the page and move into the dashboard only after authentication succeeds.
                </p>
              </div>

              <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setView("sign-in")}
                  className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: view === "sign-in" ? "rgba(215, 35, 35, 0.95)" : "transparent",
                    color: "#f5eded",
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setView("sign-up")}
                  className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: view === "sign-up" ? "rgba(215, 35, 35, 0.95)" : "transparent",
                    color: "#f5eded",
                  }}
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-[#121012] p-5 md:p-8">
            <div className="w-full max-w-md">
              {view === "sign-in" ? (
                <SignIn
                  routing="hash"
                  signUpUrl="#sign-up"
                  forceRedirectUrl={dashboardHref}
                  fallbackRedirectUrl={dashboardHref}
                />
              ) : (
                <SignUp
                  routing="hash"
                  signInUrl="#sign-in"
                  forceRedirectUrl={dashboardHref}
                  fallbackRedirectUrl={dashboardHref}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
