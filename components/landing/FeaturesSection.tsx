"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FeatureCard from "./FeatureCard";

if (typeof window !== "undefined") {
   gsap.registerPlugin(ScrollTrigger);
}

const features = [
   {
      number: "01",
      title: "Campaign Brain",
      subtitle: "Describe your goal. Vora builds the workflow.",
      body: 'Type "Warm up 50 SaaS CTOs over 5 days" and Campaign Brain generates a complete multi-step outreach workflow — nodes, delays, branches, and all.',
      tag: "Natural Language → Workflow",
      accent: "var(--accent-primary)",
      visual: "campaign-brain" as const,
   },
   {
      number: "02",
      title: "Persona Intelligence",
      subtitle: "Every message shaped by personality, never templates.",
      body: "Vora enriches each lead with Crystal DISC data (D, I, S, or C) and writes messages in the style each buyer naturally responds to.",
      tag: "Crystal · DISC Profiles",
      accent: "var(--accent-secondary)",
      visual: "persona" as const,
   },
   {
      number: "03",
      title: "Circadian Timing",
      subtitle: "Sent when your lead is most likely to open it.",
      body: "Vora analyzes each lead's historical email engagement timestamps and calculates their personal optimal send window.",
      tag: "Per-Lead Timing Engine",
      accent: "var(--accent-primary)",
      visual: "timing" as const,
   },
   {
      number: "04",
      title: "Ghost Detector",
      subtitle: "Silence isn't the end. It's a signal.",
      body: "When a lead goes dark, Vora diagnoses why — bad timing, tone mismatch, spam filters — and generates a completely new re-engagement strategy.",
      tag: "AI Silence Analysis",
      accent: "var(--accent-secondary)",
      visual: "ghost" as const,
   },
   {
      number: "05",
      title: "Human Handoff Intelligence",
      subtitle: "When it's time for a human, they can't possibly fail.",
      body: "When a lead's readiness score crosses 70, Vora hands off with a complete AI call brief — personality summary, objections, and recommended opener.",
      tag: "Readiness Score · Call Brief",
      accent: "var(--accent-secondary)",
      visual: "handoff" as const,
   },
   {
      number: "06",
      title: "Committee Mapper",
      subtitle: "Refine leads using existing account intelligence.",
      body: "Vora maps decision makers, influencers, and blockers from existing lead history so your campaign targets the full buying committee instead of a single contact.",
      tag: "Buying Committee Intelligence",
      accent: "var(--accent-primary)",
      visual: "committee" as const,
   },
   {
      number: "07",
      title: "Objection Pre-loader",
      subtitle: "Predict objections before the first reply lands.",
      body: "Based on persona, role, and campaign context, Vora forecasts likely objections and pre-loads AI-generated responses so reps can answer in seconds.",
      tag: "Predictive Reply Library",
      accent: "var(--accent-secondary)",
      visual: "objection" as const,
   },
   {
      number: "08",
      title: "ROI Simulator",
      subtitle: "See outcome scenarios before you launch.",
      body: "Run expected-send, open, reply, and meeting projections with adjustable assumptions to understand campaign upside and risk before a single email goes out.",
      tag: "Pre-Launch Forecasting",
      accent: "var(--accent-primary)",
      visual: "roi" as const,
   },
   {
      number: "09",
      title: "Link Engagement Tracker",
      subtitle: "Turn clicks into insights in real time.",
      body: "Measure every interaction across your outreach links, spot high-intent behavior instantly, and prioritize leads based on true engagement signals.",
      tag: "Real-Time Click Intelligence",
      accent: "var(--accent-secondary)",
      visual: "link-engagement" as const,
   },
];

export default function FeaturesSection() {
   const sectionRef = useRef<HTMLElement>(null);
   const headerRef = useRef<HTMLDivElement>(null);
   const cardsTrackRef = useRef<HTMLDivElement>(null);
   const stickyRef = useRef<HTMLDivElement>(null);
   const totalFeatures = features.length;
   const introPhase = 0.16;
   const navOffset = "6.5rem";
   const introScrollVh = 110;
   const featureScrollVh = 125;

   useEffect(() => {
      const section = sectionRef.current;
      const header = headerRef.current;
      const cardsTrack = cardsTrackRef.current;
      const sticky = stickyRef.current;
      if (!section || !header || !cardsTrack || !sticky) return;

      const ctx = gsap.context(() => {
         gsap.fromTo(
            header,
            { y: 120 },
            {
               y: 0,
               ease: "none",
               scrollTrigger: {
                  trigger: cardsTrack,
                  start: "top top",
                  end: `${introPhase * 100}% top`,
                  scrub: 1,
               },
            }
         );

         gsap.fromTo(
            header,
            { opacity: 1 },
            {
               opacity: 0.8,
               ease: "none",
               scrollTrigger: {
                  trigger: cardsTrack,
                  start: `${introPhase * 100}% top`,
                  end: `${(introPhase + 0.1) * 100}% top`,
                  scrub: 1,
               },
            }
         );

         const scrollRange = 1 - introPhase;
         const featureSegment = scrollRange / totalFeatures;

         features.forEach((_, i) => {
            const featureEl = sticky.querySelector(`[data-feature="${i}"]`) as HTMLElement;
            if (!featureEl) return;

            const progress = introPhase + (i / totalFeatures) * scrollRange;
            const nextProgress = introPhase + ((i + 1) / totalFeatures) * scrollRange;
            const revealStart = progress + featureSegment * 0.03;
            const revealEnd = progress + featureSegment * 0.36;

            gsap.fromTo(
               featureEl,
               { opacity: 0, y: 90 },
               {
                  opacity: 1,
                  y: 0,
                  ease: "power2.out",
                  scrollTrigger: {
                     trigger: cardsTrack,
                     start: `${revealStart * 100}% top`,
                     end: `${revealEnd * 100}% top`,
                     scrub: 0.6,
                  },
               }
            );

            if (i < totalFeatures - 1) {
               const exitStart = nextProgress - featureSegment * 0.28;
               const exitEnd = nextProgress - featureSegment * 0.04;
               gsap.to(featureEl, {
                  opacity: 0,
                  y: -40,
                  ease: "power2.in",
                  scrollTrigger: {
                     trigger: cardsTrack,
                     start: `${exitStart * 100}% top`,
                     end: `${exitEnd * 100}% top`,
                     scrub: 0.6,
                  },
               });
            }
         });

         gsap.to(header, {
            opacity: 0,
            ease: "none",
            scrollTrigger: {
               trigger: cardsTrack,
               start: `${(1 - 0.1) * 100}% top`,
               end: "bottom top",
               scrub: 1,
            },
         });
      }, section);

      return () => ctx.revert();
   }, [introPhase, totalFeatures]);

   return (
      <section ref={sectionRef} id="features" style={{ position: "relative", background: "var(--bg-base)" }}>
         <div
            ref={cardsTrackRef}
            style={{ position: "relative", height: `${introScrollVh + totalFeatures * featureScrollVh}vh` }}
         >
            <div
               ref={stickyRef}
               style={{
                  position: "sticky",
                  top: navOffset,
                  height: `calc(100vh - ${navOffset})`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
               }}
            >
               <div
                  ref={headerRef}
                  style={{
                     position: "absolute",
                     top: "2rem",
                     left: 0,
                     right: 0,
                     display: "flex",
                     flexDirection: "column",
                     alignItems: "center",
                     pointerEvents: "none",
                     zIndex: 3,
                  }}
               >
                  <h2
                     style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
                        color: "var(--text-primary)",
                        textAlign: "center",
                        letterSpacing: "-0.02em",
                        whiteSpace: "nowrap",
                        paddingInline: "1rem",
                        textTransform: "uppercase",
                      }}
                  >
                     How Vora thinks, sends, and decides.
                  </h2>
               </div>

               {features.map((feature, i) => (
                  <div
                     key={i}
                     data-feature={i}
                     style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8rem 2rem 2rem",
                        opacity: 0,
                     }}
                  >
                     <div
                        style={{
                           display: "grid",
                           gridTemplateColumns: "1.1fr 0.9fr",
                           alignItems: "center",
                           gap: "4rem",
                           width: "100%",
                           maxWidth: "1200px",
                        }}
                     >
                        <FeatureCard feature={feature} side="visual" />
                        <FeatureCard feature={feature} side="text" />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>
   );
}
