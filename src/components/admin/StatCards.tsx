"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

export interface Stat {
  label: string;
  value: number;
  href: string;
  badge: string;
  /** optional muted line under the label, e.g. "of 450 seats" */
  sub?: string;
  /** pastel gradient wash, like the reference board cards */
  tone: "violet" | "orange" | "emerald" | "sky" | "rose";
}

const tones = {
  violet: {
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(167,139,250,0.35) 0%, rgba(255,255,255,0) 55%)",
    badge: "bg-violet-100/80 text-violet-700",
  },
  orange: {
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.38) 0%, rgba(255,255,255,0) 55%)",
    badge: "bg-orange-100/80 text-orange-700",
  },
  emerald: {
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(52,211,153,0.32) 0%, rgba(255,255,255,0) 55%)",
    badge: "bg-emerald-100/80 text-emerald-700",
  },
  sky: {
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(56,189,248,0.32) 0%, rgba(255,255,255,0) 55%)",
    badge: "bg-sky-100/80 text-sky-700",
  },
  rose: {
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,113,133,0.34) 0%, rgba(255,255,255,0) 55%)",
    badge: "bg-rose-100/80 text-rose-700",
  },
} as const;

export function StatCards({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (!reduceMotion) {
        gsap.from(".stat-card", {
          y: 26,
          opacity: 0,
          scale: 0.97,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "all",
        });
      }
      // Count-up numbers
      ref.current!.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count ?? 0);
        if (reduceMotion || target === 0) {
          el.textContent = String(target);
          return;
        }
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: target,
          duration: 1.1,
          ease: "power2.out",
          onUpdate() {
            el.textContent = String(Math.round(proxy.v));
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [stats]);

  // Keep a single tidy row on wide screens whatever the count (four funnel
  // cards, or five once "Seats booked" joins them).
  const xlCols = stats.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4";

  return (
    <div ref={ref} className={`grid gap-4 sm:grid-cols-2 ${xlCols}`}>
      {stats.map((s) => {
        const tone = tones[s.tone];
        return (
          <Link
            key={s.label}
            href={s.href}
            className="stat-card group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-950/10"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: tone.wash }}
            />
            <span
              className={`relative inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}
            >
              {s.badge}
            </span>
            <p
              className="relative mt-3 text-4xl font-bold tracking-tight text-slate-900"
              data-count={s.value}
            >
              0
            </p>
            <p className="relative mt-1 text-sm font-medium text-slate-500">
              {s.label}
              <span className="ml-1 inline-block opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </p>
            {s.sub && (
              <p className="relative mt-0.5 text-xs font-medium text-slate-400">
                {s.sub}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
