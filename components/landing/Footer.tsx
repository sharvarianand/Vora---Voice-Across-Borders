"use client";

import Image from "next/image";
import Link from "next/link";export default function Footer() {
   return (
      <footer
         style={{
            background: "var(--bg-base)",
            borderTop: "1px solid var(--bg-border)",
         }}
      >
         <div
            style={{
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
               padding: "1.5rem 4rem",
            }}
         >
            <Link
               href="/"
               style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontFamily: "var(--font-heading)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
               }}
            >
               <Image src="/vora_logo.png" alt="Vora" width={24} height={24} />
               <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                  <span>Vora</span>
                  <span style={{ fontSize: "0.5rem", fontWeight: 400, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "lowercase" }}>voice across borders</span>
               </span>
            </Link>

            <div style={{ display: "flex", gap: "2rem" }}>
               {["Features", "Dashboard", "Contact", "Privacy"].map((link) => (
                  <Link
                     key={link}
                     href={link === "Dashboard" ? "/dashboard" : link === "Privacy" ? "/privacy" : `/#${link.toLowerCase().replace(/\s+/g, "-")}`}
                     style={{
                        color: "var(--text-tertiary)",
                        fontSize: "0.8125rem",
                        transition: "color 200ms ease",
                     }}
                     onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--text-secondary)")
                     }
                     onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-tertiary)")
                     }
                  >
                     {link}
                  </Link>
               ))}
            </div>
         </div>

         <div
            style={{
               display: "flex",
               justifyContent: "space-between",
               padding: "0 4rem 1.5rem",
               fontSize: "0.8125rem",
               color: "var(--text-tertiary)",
            }}
         >
            <span>© 2026 Vora — Voice Across Borders. All rights reserved.</span>
            <span>Built with Next.js · Powered by AI</span>
         </div>
      </footer>
   );
}
