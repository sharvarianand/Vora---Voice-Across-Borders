"use client";

import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

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
}: LandingAuthButtonProps) {
  return (
    <Link href={dashboardHref} className={className} style={style}>
      {children}
    </Link>
  );
}
