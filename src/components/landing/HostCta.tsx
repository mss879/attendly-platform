"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

// "Host your event" pitch — the dark stadium-night panel from the event
// pages, repurposed for organizers.

const perks = [
  "Your own animated event page with a live countdown",
  "Numbered seat maps sized to your venue",
  "Payments straight to your bank account — verified by you",
  "QR tickets, gate scanning and a live dashboard",
];

export function HostCta() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".host-reveal", {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
        clearProps: "all",
      });
      // Slow breathing glow behind the panel content.
      gsap.to(".host-glow", {
        opacity: 0.75,
        scale: 1.15,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} id="host" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="host-glow pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(55% 65% at 25% 30%, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0) 70%), radial-gradient(55% 65% at 75% 70%, rgba(234,88,12,0.28) 0%, rgba(0,0,0,0) 70%)",
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="host-reveal text-[11px] font-bold uppercase tracking-[0.3em] text-orange-400">
            For organizers
          </p>
          <h2 className="host-reveal mx-auto mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Run your event on{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Attendly.
            </span>
          </h2>
          <p className="host-reveal mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
            Apply in minutes, set up your seats and pricing, and go live once
            the Attendly team approves your event. You stay in full control of
            payments and the gate.
          </p>

          <ul className="host-reveal mx-auto mt-8 grid max-w-xl gap-2.5 text-left sm:grid-cols-2">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/85 ring-1 ring-white/10">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>

          <div className="host-reveal mt-9">
            <Link
              href="/host"
              className="inline-block rounded-full bg-orange-600 px-9 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/40 transition hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-xl"
            >
              Host your event →
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">
              Free to apply · Reviewed by the Attendly team
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
