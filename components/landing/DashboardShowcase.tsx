"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
   gsap.registerPlugin(ScrollTrigger);
}

const kpis = [
   { label: "Emails Sent", value: "247", color: "var(--accent-primary)" },
   { label: "Replies", value: "31", color: "var(--accent-secondary)" },
   { label: "Reply Rate", value: "12.6%", color: "var(--accent-secondary-dim)" },
   { label: "In Handoff", value: "4", color: "var(--accent-primary)" },
];

const leads = [
   { initials: "PS", name: "Priya Sharma", company: "FinStack", score: 82, status: "Ready to Call", statusColor: "var(--accent-secondary)", statusBg: "var(--accent-secondary-glow)" },
   { initials: "AK", name: "Arjun Kapoor", company: "DataPulse", score: 65, status: "Warming Up", statusColor: "var(--accent-primary)", statusBg: "var(--accent-primary-glow)" },
   { initials: "MG", name: "Meera Gupta", company: "CloudNine", score: 71, status: "Ready to Call", statusColor: "var(--accent-secondary)", statusBg: "var(--accent-secondary-glow)" },
];

export default function DashboardShowcase() {
   const sectionRef = useRef<HTMLElement>(null);

   useEffect(() => {
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
         const cards = sectionRef.current?.querySelectorAll(".dash-card");
         if (cards) {
            gsap.from(cards, {
               opacity: 0,
               y: 60,
               duration: 0.8,
               ease: "power3.out",
               stagger: 0.15,
               scrollTrigger: {
                  trigger: sectionRef.current,
                  start: "top 70%",
                  toggleActions: "play none none none",
               },
            });
         }
      }, sectionRef);

      return () => ctx.revert();
   }, []);

   const cardStyle: React.CSSProperties = {
      background: "var(--bg-card)",
      border: "1px solid var(--bg-border)",
      borderRadius: "20px",
      padding: "1.75rem",
      transition: "box-shadow 300ms ease",
   };

   return (
      <section
         ref={sectionRef}
         id="dashboard"
         style={{
            minHeight: "100vh",
            background: "var(--bg-base)",
            padding: "6rem 4rem",
         }}
      >
         <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span className="section-label" style={{ marginBottom: "1rem", display: "inline-flex" }}>
               Live Intelligence
            </span>
            <h2
               style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  marginTop: "1rem",
                  lineHeight: 1.15,
               }}
            >
               The control room for every
               <br />
               outreach campaign you run.
            </h2>
         </div>

         <div
            style={{
               display: "grid",
               gridTemplateColumns: "1fr 1fr",
               gridTemplateRows: "auto auto",
               gap: "1.5rem",
               maxWidth: "900px",
               margin: "0 auto",
            }}
         >
            {/* Card 1 — Campaign Overview (wide, spans 2 cols) */}
            <div
               className="dash-card"
               style={{ ...cardStyle, gridColumn: "1 / -1" }}
               onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 40px var(--accent-primary-glow)")
               }
               onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
               <div
                  style={{
                     fontSize: "0.75rem",
                     color: "var(--text-tertiary)",
                     marginBottom: "1.25rem",
                     letterSpacing: "0.05em",
                  }}
               >
                  Product Overview · my-b2b-saas
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
                  {kpis.map((kpi, idx) => (
                     <div key={idx}>
                        <div
                           style={{
                              fontFamily: "var(--font-heading)",
                              fontSize: "1.75rem",
                              fontWeight: 700,
                              color: kpi.color,
                              lineHeight: 1.2,
                           }}
                        >
                           {kpi.value}
                        </div>
                        <div
                           style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}
                        >
                           {kpi.label}
                        </div>
                     </div>
                  ))}
               </div>
               {/* Sparkline bars */}
               <div
                  style={{
                     display: "flex",
                     alignItems: "flex-end",
                     gap: "3px",
                     height: "40px",
                     marginTop: "1.25rem",
                  }}
               >
                  {[30, 45, 35, 55, 70, 50, 65, 80, 60, 75, 85, 70].map((h, i) => (
                     <div
                        key={i}
                        style={{
                           flex: 1,
                           height: `${h}%`,
                           borderRadius: "2px",
                           background: `linear-gradient(to top, var(--accent-primary-dim), var(--accent-primary))`,
                           opacity: 0.6 + (h / 100) * 0.4,
                        }}
                     />
                  ))}
               </div>
            </div>

            {/* Card 2 — Campaign Health Score */}
            <div
               className="dash-card"
               style={cardStyle}
               onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 40px var(--accent-primary-glow)")
               }
               onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
               <div
                  style={{
                     fontSize: "0.75rem",
                     color: "var(--text-tertiary)",
                     marginBottom: "1.25rem",
                     letterSpacing: "0.05em",
                  }}
               >
                  Campaign Health Score
               </div>
               {/* Arc gauge */}
               <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                  <div style={{ position: "relative", width: "120px", height: "120px" }}>
                     <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
                        <circle
                           cx="60"
                           cy="60"
                           r="50"
                           fill="none"
                           stroke="var(--accent-primary)"
                           strokeWidth="8"
                           strokeDasharray={2 * Math.PI * 50}
                           strokeDashoffset={2 * Math.PI * 50 * (1 - 0.78)}
                           strokeLinecap="round"
                        />
                     </svg>
                     <div
                        style={{
                           position: "absolute",
                           inset: 0,
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                           fontFamily: "var(--font-heading)",
                           fontSize: "1.5rem",
                           fontWeight: 700,
                           color: "var(--accent-primary)",
                        }}
                     >
                        78
                     </div>
                  </div>
               </div>
               <p
                  style={{
                     fontSize: "0.8rem",
                     color: "var(--text-secondary)",
                     fontStyle: "italic",
                     textAlign: "center",
                     lineHeight: 1.5,
                  }}
               >
                  Open rate trending up 6% this week. Subject line changes working.
               </p>
            </div>

            {/* Card 3 — Human Handoff Queue */}
            <div
               className="dash-card"
               style={cardStyle}
               onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 40px var(--accent-primary-glow)")
               }
               onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
               <div
                  style={{
                     fontSize: "0.75rem",
                     color: "var(--text-tertiary)",
                     marginBottom: "1.25rem",
                     letterSpacing: "0.05em",
                  }}
               >
                  Human Handoff Queue
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {leads.map((lead) => (
                     <div
                        key={lead.name}
                        style={{
                           display: "flex",
                           alignItems: "center",
                           gap: "0.75rem",
                           padding: "0.6rem 0.75rem",
                           borderRadius: "10px",
                           background: "var(--bg-elevated)",
                        }}
                     >
                        {/* Avatar */}
                        <div
                           style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "var(--bg-border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: "var(--text-secondary)",
                              flexShrink: 0,
                           }}
                        >
                           {lead.initials}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <div
                              style={{
                                 fontSize: "0.8rem",
                                 fontWeight: 500,
                                 color: "var(--text-primary)",
                                 lineHeight: 1.3,
                              }}
                           >
                              {lead.name}
                           </div>
                           <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                              {lead.company}
                           </div>
                        </div>
                        {/* Score bar */}
                        <div style={{ width: "50px", height: "5px", borderRadius: "3px", background: "var(--bg-base)", overflow: "hidden" }}>
                           <div
                              style={{
                                 width: `${lead.score}%`,
                                 height: "100%",
                                 borderRadius: "3px",
                                 background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
                              }}
                           />
                        </div>
                        {/* Status */}
                        <span
                           style={{
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "4px",
                              background: lead.statusBg,
                              color: lead.statusColor,
                              whiteSpace: "nowrap",
                           }}
                        >
                           {lead.status}
                        </span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>
   );
}
