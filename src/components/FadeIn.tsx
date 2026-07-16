"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

/**
 * GSAP entrance wrapper: fades + slides its content up on mount.
 * With `stagger`, direct children animate in sequence.
 */
export function FadeIn({
  children,
  stagger = false,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  stagger?: boolean;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        const targets = stagger ? Array.from(ref.current!.children) : ref.current!;
        gsap.from(targets, {
          y: 18,
          opacity: 0,
          duration: 0.65,
          delay,
          ease: "power3.out",
          stagger: stagger ? 0.07 : 0,
          clearProps: "all",
        });
      }, ref);
      return () => ctx.revert();
    });
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
