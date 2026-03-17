"use client";

import type { ReactNode } from "react";
import GSAPProvider from "@/providers/GSAPProvider";

export default function LandingProviders({ children }: { children: ReactNode }) {
  return <GSAPProvider>{children}</GSAPProvider>;
}
