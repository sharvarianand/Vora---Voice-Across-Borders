"use client";

import { ReactNode, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function LenisProvider({ children }: { children: ReactNode }) {
   const lenisRef = useRef<Lenis | null>(null);

   useEffect(() => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;

      const lenis = new Lenis({
         duration: mobile ? 1.2 : 1.35,
         easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
         orientation: "vertical",
         // Trackpads often produce diagonal deltas; allowing both prevents dropped gestures.
         gestureOrientation: "both",
         smoothWheel: true,
         wheelMultiplier: mobile ? 1 : 0.9,
         // Mobile touch needs a higher multiplier so the page keeps up with your finger
         touchMultiplier: mobile ? 2.2 : 1.0,
         // Higher lerp = snappier catch-up; desktop stays cinematic, mobile feels responsive
         lerp: mobile ? 0.12 : 0.08,
         // Precision trackpads emit many tiny pixel deltas; boost them so long pinned sections
         // remain responsive without making mouse-wheel jumps too aggressive.
         virtualScroll: (data) => {
            if (!(data.event instanceof WheelEvent)) return true;

            // Let browser-level pinch zoom gestures pass through untouched.
            if (data.event.ctrlKey) return false;

            const absY = Math.abs(data.deltaY);
            const absX = Math.abs(data.deltaX);
            const isLikelyTrackpad = data.event.deltaMode === 0 && absY > 0 && absY < 40;

            if (isLikelyTrackpad) {
               data.deltaY *= 1.45;
               data.deltaX *= 1.2;
            } else if (absY > 0 && absY < 120 && absX > 0 && absX < 120) {
               data.deltaY *= 1.15;
               data.deltaX *= 1.1;
            }

            return true;
         },
      });

      lenisRef.current = lenis;

      // Sync Lenis with GSAP's ticker
      function update(time: number) {
         lenis.raf(time * 1000);
      }

      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);

      // Connect Lenis scroll to ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);

      return () => {
         gsap.ticker.remove(update);
         lenis.destroy();
         lenisRef.current = null;
      };
   }, []);

   return <>{children}</>;
}
