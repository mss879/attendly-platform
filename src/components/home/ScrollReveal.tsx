"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/** Like FadeIn, but triggered when the element scrolls into view. */
export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        gsap.from(ref.current, {
          y: 28,
          autoAlpha: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 84%" },
          clearProps: "all",
        });
      }, ref);
      return () => ctx.revert();
    });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
