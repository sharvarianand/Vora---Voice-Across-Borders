"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
   gsap.registerPlugin(ScrollTrigger);
}

export default function ContactSection() {
   const sectionRef = useRef<HTMLElement>(null);

   useEffect(() => {
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
         gsap.from(sectionRef.current, {
            opacity: 0,
            y: 50,
            scale: 0.97,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
               trigger: sectionRef.current,
               start: "top 80%",
               toggleActions: "play none none none",
            },
         });
      }, sectionRef);

      return () => ctx.revert();
   }, []);

   return (
      <section
         ref={sectionRef}
         id="contact"
         style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "6rem 2rem",
            background: "var(--bg-surface)",
            position: "relative",
            overflow: "hidden",
         }}
      >
         <div
            style={{
               position: "absolute",
               bottom: "-20%",
               left: "50%",
               transform: "translateX(-50%)",
               width: "60%",
               height: "60%",
               background:
                  "radial-gradient(ellipse at center, rgba(215, 35, 35, 0.12) 0%, transparent 70%)",
               pointerEvents: "none",
            }}
         />

         <h2
            style={{
               fontFamily: "var(--font-heading)",
               fontSize: "clamp(2.5rem, 5vw, 4rem)",
               textAlign: "center",
               lineHeight: 1.1,
               letterSpacing: "-0.03em",
               color: "var(--text-primary)",
               maxWidth: "600px",
               marginBottom: "1.5rem",
               position: "relative",
            }}
         >
            Ready to let{" "}
            <span className="gradient-text">Vora</span>
            <br />
            do the outreach?
         </h2>

         <p
            style={{
               fontSize: "1.125rem",
               color: "var(--text-secondary)",
               textAlign: "center",
               maxWidth: "520px",
               lineHeight: 1.7,
               marginBottom: "2.5rem",
               position: "relative",
            }}
         >
            Join teams using Vora to run intelligent, personalized outreach
            that&apos;s safe, compliant, and built around the human conversation.
         </p>

          <form
             action="/dashboard"
             style={{
                display: "flex",
                gap: "0.75rem",
                width: "100%",
                maxWidth: "480px",
                position: "relative",
             }}
          >
            <input
               type="email"
               placeholder="Enter your work email"
               style={{
                  flex: 1,
                  padding: "0.85rem 1.25rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                  transition: "border-color 200ms ease, box-shadow 200ms ease",
               }}
               onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.boxShadow =
                     "0 0 0 2px rgba(215, 35, 35, 0.25)";
               }}
               onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--bg-border)";
                  e.currentTarget.style.boxShadow = "none";
               }}
            />
             <button
                type="submit"
                style={{
                   padding: "0.85rem 1.5rem",
                   background: "var(--accent-primary)",
                   color: "var(--text-primary)",
                   borderRadius: "12px",
                   fontSize: "0.95rem",
                   fontWeight: 600,
                   fontFamily: "var(--font-body)",
                   whiteSpace: "nowrap",
                   transition: "opacity 200ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
             >
                Go to Dashboard →
             </button>
         </form>

         <p
            style={{
               marginTop: "1.5rem",
               fontSize: "0.8125rem",
               color: "var(--text-tertiary)",
               textAlign: "center",
               lineHeight: 1.6,
               position: "relative",
            }}
         >
            No cold email scripts. No manual follow-ups.
            <br />
            Just leads that are ready to talk.
         </p>
      </section>
   );
}
