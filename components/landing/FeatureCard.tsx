"use client";

interface Feature {
   number: string;
   title: string;
   subtitle: string;
   body: string;
   tag: string;
   accent: string;
   visual:
      | "campaign-brain"
      | "persona"
      | "timing"
      | "ghost"
      | "handoff"
      | "committee"
      | "objection"
      | "roi"
      | "link-engagement";
}

interface FeatureCardProps {
   feature: Feature;
   side: "visual" | "text";
}

export default function FeatureCard({ feature, side }: FeatureCardProps) {
   if (side === "text") {
      return <FeatureText feature={feature} />;
   }
   return <FeatureVisual feature={feature} />;
}

/* ═══════════════════════════════════════════
   TEXT SIDE
   ═══════════════════════════════════════════ */

function FeatureText({ feature }: { feature: Feature }) {
   return (
      <div
         style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            padding: "3rem 2.5rem",
         }}
      >
         <span
            style={{
               fontFamily: "var(--font-body)",
               fontSize: "0.8rem",
               color: "var(--text-tertiary)",
               fontWeight: 500,
               letterSpacing: "0.1em",
            }}
         >
            {feature.number}
         </span>

         <h2
            style={{
               fontFamily: "var(--font-heading)",
               fontSize: "clamp(2rem, 4vw, 3rem)",
               fontWeight: 700,
               letterSpacing: "-0.03em",
               color: "var(--text-primary)",
               lineHeight: 1.1,
            }}
         >
            {feature.title}
         </h2>

         <p
            style={{
               fontSize: "1.15rem",
               color: feature.accent,
               fontStyle: "italic",
               lineHeight: 1.4,
            }}
         >
            {feature.subtitle}
         </p>

         <p
            style={{
               fontSize: "1rem",
               color: "var(--text-secondary)",
               lineHeight: 1.7,
               maxWidth: "380px",
            }}
         >
            {feature.body}
         </p>

      </div>
   );
}

/* ═══════════════════════════════════════════
   VISUAL SIDE — unique HTML/CSS illustrations
   ═══════════════════════════════════════════ */

function FeatureVisual({ feature }: { feature: Feature }) {
   return (
      <div
         style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
         }}
      >
         <div
            style={{
               background: "var(--bg-card)",
               border: "1px solid var(--bg-border)",
               borderRadius: "24px",
               padding: "2rem",
               width: "100%",
               maxWidth: "520px",
               minHeight: "360px",
               display: "flex",
               flexDirection: "column",
               justifyContent: "center",
            }}
         >
            {feature.visual === "campaign-brain" && <CampaignBrainVisual />}
            {feature.visual === "persona" && <PersonaVisual />}
            {feature.visual === "timing" && <TimingVisual />}
            {feature.visual === "ghost" && <GhostVisual />}
            {feature.visual === "handoff" && <HandoffVisual />}
            {feature.visual === "committee" && <CommitteeMapperVisual />}
            {feature.visual === "objection" && <ObjectionPreloaderVisual />}
            {feature.visual === "roi" && <ROISimulatorVisual />}
            {feature.visual === "link-engagement" && <LinkEngagementTrackerVisual />}
         </div>
      </div>
   );
}

/* ─── Campaign Brain ─── */
function CampaignBrainVisual() {
   const nodes = ["Start", "Message", "2-Day Delay", "If Replied?"];

   return (
      <div
         style={{
            backgroundImage:
               "radial-gradient(var(--bg-border) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            borderRadius: "16px",
            padding: "2rem 1.5rem",
            position: "relative",
         }}
      >
         <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {nodes.map((node, i) => (
               <div key={node} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                     style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--accent-primary)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                     }}
                  >
                     {node}
                  </div>
                  {i < nodes.length - 1 && (
                     <span style={{ color: "var(--accent-primary)", fontSize: "1rem" }}>→</span>
                  )}
               </div>
            ))}
         </div>
         <p
            style={{
               textAlign: "center",
               marginTop: "1.5rem",
               fontSize: "0.75rem",
               color: "var(--text-tertiary)",
               fontStyle: "italic",
            }}
         >
            &quot;Warm up 50 SaaS CTOs over 5 days&quot;
         </p>
      </div>
   );
}

/* ─── Persona Visual ─── */
function PersonaVisual() {
   const quads = [
      { label: "D", desc: "Short · Direct · ROI-first", color: "var(--accent-primary)" },
      { label: "I", desc: "Warm · Story-driven", color: "var(--accent-secondary)" },
      { label: "S", desc: "Empathetic · Low-pressure", color: "var(--accent-secondary-dim)" },
      { label: "C", desc: "Data-heavy · Structured", color: "var(--accent-primary-dim)" },
   ];

   return (
      <div>
         <div
            style={{
               display: "grid",
               gridTemplateColumns: "1fr 1fr",
               gap: "0.75rem",
               marginBottom: "1rem",
            }}
         >
            {quads.map((q) => (
               <div
                  key={q.label}
                  style={{
                     padding: "1.25rem",
                     borderRadius: "12px",
                     background: "var(--bg-elevated)",
                     textAlign: "center",
                  }}
               >
                  <div
                     style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-heading)",
                        color: q.color,
                        marginBottom: "0.4rem",
                     }}
                  >
                     {q.label}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                     {q.desc}
                  </div>
               </div>
            ))}
         </div>
         {/* Lead tag */}
         <div
            style={{
               padding: "0.6rem 1rem",
               borderRadius: "8px",
               background: "var(--bg-elevated)",
               display: "flex",
               alignItems: "center",
            }}
         >
            <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
               Priya S. — D-type detected
            </span>
         </div>
      </div>
   );
}

/* ─── Timing Visual ─── */
function TimingVisual() {
   const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
   const heights = [40, 55, 35, 90, 50, 25, 20];

   return (
      <div>
         <div
            style={{
               display: "flex",
               alignItems: "flex-end",
               justifyContent: "center",
               gap: "0.6rem",
               height: "140px",
               marginBottom: "1rem",
               position: "relative",
            }}
         >
            {days.map((day, i) => (
               <div key={day} style={{ textAlign: "center", flex: 1 }}>
                  <div
                     style={{
                        height: `${heights[i]}%`,
                        minHeight: "12px",
                        borderRadius: "6px 6px 2px 2px",
                        background: i === 3 ? "var(--accent-primary)" : "var(--bg-elevated)",
                        transition: "background 300ms ease",
                        marginBottom: "0.5rem",
                     }}
                  />
                  <span
                     style={{
                        fontSize: "0.65rem",
                        color: i === 3 ? "var(--accent-primary)" : "var(--text-tertiary)",
                        fontWeight: i === 3 ? 600 : 400,
                     }}
                  >
                     {day}
                  </span>
               </div>
            ))}
         </div>
         {/* Best window pill */}
         <div style={{ textAlign: "center" }}>
            <span
               style={{
                  display: "inline-block",
                  padding: "0.35rem 1rem",
                  borderRadius: "50px",
                  background: "var(--accent-primary-glow)",
                  color: "var(--accent-primary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
               }}
            >
               Best window: Thu 8–9am
            </span>
            <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
               Confidence: High · Based on 3 opens
            </p>
         </div>
      </div>
   );
}

/* ─── Ghost Visual ─── */
function GhostVisual() {
   const events = [
      { label: "Email 1 sent", filled: true },
      { label: "Email 2 sent", filled: true },
      { label: "Follow-up sent", filled: true },
      { label: "No response", filled: false },
      { label: "No response", filled: false },
   ];

   return (
      <div>
         {/* Timeline */}
         <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {events.map((ev, i) => (
               <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                     style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: ev.filled ? "var(--accent-primary)" : "transparent",
                        border: ev.filled
                           ? "2px solid var(--accent-primary)"
                           : "2px solid var(--text-tertiary)",
                        flexShrink: 0,
                     }}
                  />
                  {i < events.length - 1 && (
                     <div
                        style={{
                           position: "absolute",
                           left: "calc(2rem + 4px)",
                           width: "1px",
                           height: "24px",
                           borderLeft: "1px dashed var(--bg-border)",
                        }}
                     />
                  )}
                  <span
                     style={{
                        fontSize: "0.8rem",
                        color: ev.filled ? "var(--text-secondary)" : "var(--text-tertiary)",
                     }}
                  >
                     {ev.label}
                  </span>
               </div>
            ))}
         </div>
         {/* Diagnosis */}
         <div
            style={{
               padding: "1rem 1.25rem",
               borderRadius: "12px",
               background: "var(--accent-secondary-glow)",
               border: "1px solid rgba(245, 237, 237, 0.15)",
            }}
         >
            <p style={{ fontSize: "0.8rem", color: "var(--accent-secondary)", fontWeight: 600, marginBottom: "0.3rem" }}>
               Ghost detected · Tone mismatch
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
               C-type lead, sent I-style message. Switch to data-driven approach.
            </p>
            <span
               style={{
                  display: "inline-block",
                  padding: "0.35rem 1rem",
                  borderRadius: "50px",
                  background: "var(--accent-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
               }}
            >
               Re-engage →
            </span>
         </div>
      </div>
   );
}

/* ─── Handoff Visual ─── */
function HandoffVisual() {
   const circumference = 2 * Math.PI * 58;
   const fill = circumference * (1 - 0.72);

   return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
         {/* Score ring */}
         <div style={{ position: "relative", width: "140px", height: "140px" }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
               <circle cx="70" cy="70" r="58" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
               <circle
                  cx="70"
                  cy="70"
                  r="58"
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={fill}
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
                  flexDirection: "column",
               }}
            >
               <span
                  style={{
                     fontFamily: "var(--font-heading)",
                     fontSize: "2rem",
                     fontWeight: 700,
                     color: "var(--accent-primary)",
                     lineHeight: 1,
                  }}
               >
                  72
               </span>
               <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>/ 100</span>
            </div>
         </div>

         {/* Call Brief */}
         <div
            style={{
               width: "100%",
               padding: "1rem 1.25rem",
               borderRadius: "12px",
               background: "var(--bg-elevated)",
            }}
         >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Crystal</span>
                  <span
                     style={{
                        padding: "0.1rem 0.5rem",
                        borderRadius: "4px",
                        background: "var(--accent-primary-glow)",
                        color: "var(--accent-primary)",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                     }}
                  >
                     D-type
                  </span>
               </div>
               <div style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.7rem" }}>Objection: </span>
                  Budget approval
               </div>
               <div style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.75rem" }}>
                  &quot;I&apos;ll keep this to 90 seconds...&quot;
               </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
               <button
                  style={{
                     padding: "0.4rem 0.8rem",
                     borderRadius: "8px",
                     background: "var(--accent-primary)",
                     color: "var(--text-primary)",
                     fontSize: "0.75rem",
                     fontWeight: 600,
                  }}
               >
                  📞 Call Now
               </button>
               <button
                  style={{
                     padding: "0.4rem 0.8rem",
                     borderRadius: "8px",
                     border: "1px solid var(--bg-border)",
                     color: "var(--text-secondary)",
                     fontSize: "0.75rem",
                  }}
               >
                  📅 Send Calendly
               </button>
            </div>
         </div>
      </div>
   );
}

/* ─── Committee Mapper ─── */
function CommitteeMapperVisual() {
   const stakeholders = [
      { role: "Champion", person: "Head of Ops", tone: "var(--accent-primary)" },
      { role: "Economic Buyer", person: "VP Finance", tone: "var(--accent-secondary)" },
      { role: "Blocker", person: "IT Security", tone: "var(--text-tertiary)" },
   ];

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
         <div
            style={{
               textAlign: "center",
               fontSize: "0.72rem",
               color: "var(--text-tertiary)",
               letterSpacing: "0.06em",
               textTransform: "uppercase",
            }}
         >
            Existing leads expanded into buying committee
         </div>
         <div
            style={{
               display: "grid",
               gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
               gap: "0.75rem",
            }}
         >
            {stakeholders.map((entry) => (
               <div
                  key={entry.role}
                  style={{
                     borderRadius: "12px",
                     background: "var(--bg-elevated)",
                     padding: "0.9rem 0.65rem",
                     border: "1px solid var(--bg-border)",
                     textAlign: "center",
                  }}
               >
                  <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", marginBottom: "0.35rem" }}>{entry.role}</div>
                  <div style={{ fontSize: "0.78rem", color: entry.tone, fontWeight: 600, lineHeight: 1.3 }}>{entry.person}</div>
               </div>
            ))}
         </div>
      </div>
   );
}

/* ─── Objection Pre-loader ─── */
function ObjectionPreloaderVisual() {
   const objections = [
      { objection: "No budget", response: "Phase rollout + fast payback model", confidence: "89%" },
      { objection: "Already using a tool", response: "Migration map with zero data loss", confidence: "84%" },
      { objection: "Timing not right", response: "Low-lift pilot plan in 7 days", confidence: "81%" },
   ];

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
         {objections.map((item) => (
            <div
               key={item.objection}
               style={{
                  borderRadius: "12px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-elevated)",
                  padding: "0.8rem 0.9rem",
               }}
            >
               <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginBottom: "0.35rem" }}>
                  Predicted objection
               </div>
               <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginBottom: "0.45rem", fontWeight: 600 }}>
                  {item.objection}
               </div>
               <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  AI reply: {item.response}
               </div>
               <div style={{ fontSize: "0.68rem", color: "var(--accent-secondary)", marginTop: "0.45rem" }}>
                  Confidence: {item.confidence}
               </div>
            </div>
         ))}
      </div>
   );
}

/* ─── ROI Simulator ─── */
function ROISimulatorVisual() {
   const metrics = [
      { label: "Projected Opens", value: "1,240", tone: "var(--accent-primary)" },
      { label: "Expected Replies", value: "188", tone: "var(--accent-secondary)" },
      { label: "Likely Meetings", value: "32", tone: "var(--accent-primary)" },
      { label: "Forecast Pipeline", value: "$142k", tone: "var(--accent-secondary)" },
   ];

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
         <div
            style={{
               height: "120px",
               borderRadius: "14px",
               border: "1px solid var(--bg-border)",
               background: "linear-gradient(180deg, var(--accent-primary-glow) 0%, transparent 100%)",
               display: "flex",
               alignItems: "flex-end",
               padding: "0.75rem",
               gap: "0.4rem",
            }}
         >
            {[24, 38, 44, 58, 67, 78, 86].map((v, idx) => (
               <div key={idx} style={{ flex: 1, height: `${v}%`, borderRadius: "4px 4px 2px 2px", background: "var(--accent-primary)" }} />
            ))}
         </div>
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
            {metrics.map((metric) => (
               <div key={metric.label} style={{ borderRadius: "10px", background: "var(--bg-elevated)", padding: "0.7rem 0.75rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", marginBottom: "0.2rem" }}>{metric.label}</div>
                  <div style={{ fontSize: "0.95rem", color: metric.tone, fontWeight: 700 }}>{metric.value}</div>
               </div>
            ))}
         </div>
      </div>
   );
}

/* ─── Link Engagement Tracker ─── */
function LinkEngagementTrackerVisual() {
   const links = [
      { label: "Pricing deck", clicks: 38, ctr: "31%", tone: "var(--accent-primary)" },
      { label: "Case study", clicks: 24, ctr: "22%", tone: "var(--accent-secondary)" },
      { label: "Demo scheduler", clicks: 17, ctr: "15%", tone: "var(--accent-primary)" },
   ];

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
         <div
            style={{
               borderRadius: "12px",
               border: "1px solid var(--bg-border)",
               background: "linear-gradient(180deg, var(--accent-secondary-glow) 0%, transparent 100%)",
               padding: "0.9rem 1rem",
            }}
         >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
               <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Live activity
               </span>
               <span
                  style={{
                     fontSize: "0.68rem",
                     color: "var(--accent-secondary)",
                     background: "var(--bg-elevated)",
                     border: "1px solid var(--bg-border)",
                     borderRadius: "999px",
                     padding: "0.16rem 0.5rem",
                  }}
               >
                  Updated now
               </span>
            </div>
            <div style={{ fontSize: "1.45rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", lineHeight: 1 }}>
               79 Clicks
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
               12 high-intent leads flagged this hour
            </div>
         </div>

         <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {links.map((item) => (
               <div
                  key={item.label}
                  style={{
                     borderRadius: "10px",
                     background: "var(--bg-elevated)",
                     border: "1px solid var(--bg-border)",
                     padding: "0.65rem 0.75rem",
                  }}
               >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                     <span style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>{item.label}</span>
                     <span style={{ fontSize: "0.72rem", color: item.tone, fontWeight: 600 }}>{item.ctr} CTR</span>
                  </div>
                  <div
                     style={{
                        height: "6px",
                        borderRadius: "999px",
                        background: "var(--bg-card)",
                        overflow: "hidden",
                     }}
                  >
                     <div
                        style={{
                           width: `${Math.min(item.clicks, 40) * 2.3}%`,
                           height: "100%",
                           background: item.tone,
                           borderRadius: "999px",
                        }}
                     />
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}
