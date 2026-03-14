"use client";

import { useRef, ReactNode } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

interface HorizontalSectionProps {
   children: ReactNode;
   className?: string;
}

export default function HorizontalSection({
   children,
   className = "",
}: HorizontalSectionProps) {
   const sectionRef = useRef<HTMLDivElement>(null);
   const trackRef = useRef<HTMLDivElement>(null);

   useIsomorphicLayoutEffect(() => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const ctx = gsap.context(() => {
         const cards = gsap.utils.toArray<HTMLElement>(".project-card");
         if (cards.length === 0) return;

         const totalCards = cards.length;
         const scrollDistance = totalCards * 450; // Increased feel of control

         // Set initial states
         gsap.set(cards, { flex: 1, flexShrink: 0, flexBasis: "0%" });
         cards.forEach((card) => {
            const infoPanel = card.querySelector(".project-card__info") as HTMLElement;
            if (infoPanel) gsap.set(infoPanel, { opacity: 0 });
         });

         // Expand the first card immediately
         gsap.set(cards[0], { flex: 10, flexBasis: "100%" });
         const firstInfo = (cards[0] as HTMLElement).querySelector(".project-card__info");
         if (firstInfo) gsap.set(firstInfo, { opacity: 1 });

         // Create the timeline
         const tl = gsap.timeline({
            scrollTrigger: {
               trigger: section,
               start: "top top",
               end: `+=${scrollDistance}vh`,
               pin: true,
               scrub: 1.2,
               invalidateOnRefresh: true,
               anticipatePin: 1,
            }
         });

         // Build transitions for each pair of cards
         for (let i = 0; i < totalCards - 1; i++) {
            const currentCard = cards[i];
            const nextCard = cards[i + 1];
            const currentInfo = (currentCard as HTMLElement).querySelector(".project-card__info");
            const nextInfo = (nextCard as HTMLElement).querySelector(".project-card__info");

            tl.to(currentCard, {
               flex: 1,
               flexBasis: "0%",
               duration: 1,
               ease: "power2.inOut"
            }, i)
               .to(nextCard, {
                  flex: 10,
                  flexBasis: "100%",
                  duration: 1,
                  ease: "power2.inOut"
               }, i);

            if (currentInfo) {
               tl.to(currentInfo, {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power1.inOut"
               }, i);
            }

            if (nextInfo) {
               tl.to(nextInfo, {
                  opacity: 1,
                  duration: 0.4,
                  delay: 0.5,
                  ease: "power1.inOut"
               }, i);
            }
         }
      }, section);

      return () => ctx.revert();
   }, []);

   return (
      <div
         ref={sectionRef}
         className={`horizontal-section ${className}`}
         style={{
            height: "100vh",
            width: "100vw",
            backgroundColor: "var(--cream)", // Prevent peeking from layers underneath
            position: "relative",
            zIndex: 1,
         }}
      >
         <div
            ref={trackRef}
            className="scroll-track"
            style={{
               display: "flex",
               width: "100%",
               height: "100vh",
               gap: "1.5rem",
               padding: "0 1.5rem",
               overflow: "hidden",
            }}
         >
            {children}
         </div>
      </div>
   );
}

