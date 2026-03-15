"use client";

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
   const scrollToSection = (sectionId: string) => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const top = section.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      window.history.replaceState(null, "", `/#${sectionId}`);
   };

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
               <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  style={{
                     color: "var(--text-tertiary)",
                     fontSize: "0.8125rem",
                     transition: "color 200ms ease",
                     background: "transparent",
                     border: "none",
                     cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                     (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                     (e.currentTarget.style.color = "var(--text-tertiary)")
                  }
               >
                  Features
               </button>
               <button
                  type="button"
                  onClick={() => scrollToSection("dashboard")}
                  style={{
                     color: "var(--text-tertiary)",
                     fontSize: "0.8125rem",
                     transition: "color 200ms ease",
                     background: "transparent",
                     border: "none",
                     cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                     (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                     (e.currentTarget.style.color = "var(--text-tertiary)")
                  }
               >
                  Dashboard
               </button>
               <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  style={{
                     color: "var(--text-tertiary)",
                     fontSize: "0.8125rem",
                     transition: "color 200ms ease",
                     background: "transparent",
                     border: "none",
                     cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                     (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                     (e.currentTarget.style.color = "var(--text-tertiary)")
                  }
               >
                  Contact
               </button>
               <Link
                  href="/privacy"
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
                  Privacy
               </Link>
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
