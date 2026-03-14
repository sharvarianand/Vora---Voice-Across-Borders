"use client";

import { useRef } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
   const navRef = useRef<HTMLElement>(null);

   useIsomorphicLayoutEffect(() => {
      const ctx = gsap.context(() => {
         gsap.fromTo(
            navRef.current,
            { y: -80, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.2 }
         );
      }, navRef);

      return () => ctx.revert();
   }, []);

   return (
      <nav
         ref={navRef}
         style={{
            position: "fixed",
            top: "1.25rem",
            left: "1.25rem",
            right: "1.25rem",
            margin: "0 auto",
            maxWidth: "1200px",
            zIndex: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 1.5rem 0 2rem",
            height: "4rem",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "100px",
            border: "1px solid rgba(215, 35, 35, 0.22)",
            borderTop: "1px solid rgba(245, 237, 237, 0.10)",
            boxShadow: "0 16px 35px -18px rgba(0, 0, 0, 0.50), inset 0 1px 1px rgba(245, 237, 237, 0.08)",
            opacity: 0,
         }}
      >
         {/* Logo */}
         <Link
            href="/"
            style={{
               display: "flex",
               alignItems: "center",
               gap: "0.5rem",
               fontFamily: "var(--font-heading)",
               fontSize: "1.15rem",
               fontWeight: 600,
               color: "var(--text-primary)",
            }}
         >
            <Image src="/vora_logo.png" alt="Vora" width={28} height={28} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
               <span>Vora</span>
               <span style={{ fontSize: "0.55rem", fontWeight: 400, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "lowercase" }}>voice across borders</span>
            </span>
         </Link>

         {/* Nav Links */}
         <div
            style={{
               display: "flex",
               gap: "2rem",
               alignItems: "center",
            }}
         >
            {["Features", "Dashboard", "Contact"].map((link) => (
               <Link
                  key={link}
                  href={link === "Dashboard" ? "/dashboard" : `/#${link.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{
                     color: "var(--text-secondary)",
                     fontSize: "0.875rem",
                     fontFamily: "var(--font-body)",
                     transition: "color 200ms ease",
                  }}
                  onMouseEnter={(e) =>
                     (e.currentTarget.style.color = "var(--accent-primary)")
                  }
                  onMouseLeave={(e) =>
                     (e.currentTarget.style.color = "var(--text-secondary)")
                  }
               >
                  {link}
               </Link>
            ))}
         </div>

          {/* CTA Button */}
          <Link
             href="/dashboard"
             style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "100px",
                border: "1px solid var(--accent-primary)",
                color: "var(--accent-primary)",
                fontSize: "0.875rem",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                transition: "all 200ms ease",
             }}
             onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-primary)";
                e.currentTarget.style.color = "var(--text-primary)";
             }}
             onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--accent-primary)";
             }}
          >
             Dashboard
          </Link>
      </nav>
   );
}
