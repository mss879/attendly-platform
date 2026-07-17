"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";
import type { EventTeam } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

// Optional "versus" module for events with two sides (e.g. Royal vs
// Trinity). Generalized from the original Bradby rivalry section — renders
// only when the event defines `teams`.

/** Simple sword: blade pointing up, hilt at the bottom (rotation origin). */
function Sword({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 120"
      className={`h-24 w-8 sm:h-32 sm:w-10 ${flip ? "sword-right" : "sword-left"}`}
      style={{ transformOrigin: "50% 88%" }}
      aria-hidden
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M20 6 L26 18 L26 74 L14 74 L14 18 Z"
          fill="url(#blade-grad)"
          stroke="#fed7aa"
          strokeWidth="1.5"
        />
        <path d="M20 12 L20 70" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
        <path d="M6 76 H34 L36 82 H4 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
        <rect x="16" y="82" width="8" height="24" rx="3" fill="#7c2d12" stroke="#431407" strokeWidth="1.5" />
        <circle cx="20" cy="112" r="6" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
      </g>
      <defs>
        <linearGradient id="blade-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export interface VersusSectionProps {
  edition: string | null;
  heading: string;
  home: EventTeam;
  away: EventTeam;
  tagline: string[];
}

export function VersusSection({ edition, heading, home, away, tagline }: VersusSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        if (reduceMotion) {
          gsap.set(".sword-left", { rotation: -28 });
          gsap.set(".sword-right", { rotation: 28 });
          return;
        }

        const enter = { trigger: ".rivalry-arena", start: "top 75%" };

        gsap.from(".rivalry-head", {
          y: 26,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%" },
        });

        // Entrance: crests charge in from the sides, swords rise, VS pops.
        const entrance = gsap.timeline({
          scrollTrigger: enter,
          defaults: { ease: "power3.out" },
        });
        entrance
          .from(".crest-left", { x: -110, autoAlpha: 0, rotation: -8, duration: 0.9 })
          .from(".crest-right", { x: 110, autoAlpha: 0, rotation: 8, duration: 0.9 }, "<")
          .from(".sword-left", { rotation: 40, y: 60, autoAlpha: 0, duration: 0.6 }, "-=0.4")
          .from(".sword-right", { rotation: -40, y: 60, autoAlpha: 0, duration: 0.6 }, "<")
          .to(".sword-left", { rotation: -28, duration: 0.25, ease: "power4.in" })
          .to(".sword-right", { rotation: 28, duration: 0.25, ease: "power4.in" }, "<")
          .from(".rivalry-vs", { scale: 0, autoAlpha: 0, duration: 0.5, ease: "back.out(2.2)" }, "-=0.1")
          .from(
            ".rivalry-word",
            { yPercent: 120, duration: 0.6, stagger: 0.09, clearProps: "all" },
            "-=0.15"
          );

        // Battle loop: swords wind up, slam together, sparks fly, crests lunge.
        const clash = gsap.timeline({
          repeat: -1,
          repeatDelay: 2.4,
          delay: 2.2,
          scrollTrigger: { ...enter, toggleActions: "play pause resume pause" },
        });
        clash
          .to(".sword-left", { rotation: -55, duration: 0.35, ease: "power2.out" })
          .to(".sword-right", { rotation: 55, duration: 0.35, ease: "power2.out" }, "<")
          .to(".sword-left", { rotation: -22, duration: 0.14, ease: "power4.in" })
          .to(".sword-right", { rotation: 22, duration: 0.14, ease: "power4.in" }, "<")
          .fromTo(
            ".clash-flash",
            { scale: 0.4, autoAlpha: 0.9 },
            { scale: 1.9, autoAlpha: 0, duration: 0.45, ease: "power2.out" }
          )
          .fromTo(
            ".clash-spark",
            { x: 0, y: 0, scale: 1, autoAlpha: 1 },
            {
              x: (i) => Math.cos((i / 8) * Math.PI * 2) * (46 + (i % 3) * 16),
              y: (i) => Math.sin((i / 8) * Math.PI * 2) * (36 + (i % 3) * 14),
              scale: 0.2,
              autoAlpha: 0,
              duration: 0.55,
              ease: "power3.out",
            },
            "<"
          )
          .to(".crest-left", { x: 16, rotation: 3, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.inOut" }, "<")
          .to(".crest-right", { x: -16, rotation: -3, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.inOut" }, "<")
          .to(".rivalry-arena", { y: 3, duration: 0.05, yoyo: true, repeat: 5, ease: "none" }, "<")
          .to(".sword-left", { rotation: -28, duration: 0.5, ease: "elastic.out(1, 0.5)" }, "+=0.1")
          .to(".sword-right", { rotation: 28, duration: 0.5, ease: "elastic.out(1, 0.5)" }, "<");
      }, ref);
      return () => ctx.revert();
    });
  }, []);

  return (
    <section ref={ref} id="rivalry" className="scroll-mt-24 px-4 py-16 sm:px-7 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-4 py-12 sm:px-10 sm:py-16">
        {/* Stadium night glows behind each side */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 65% at 18% 45%, rgba(245,158,11,0.28) 0%, rgba(0,0,0,0) 70%), radial-gradient(55% 65% at 82% 45%, rgba(220,38,38,0.30) 0%, rgba(0,0,0,0) 70%), radial-gradient(60% 40% at 50% 100%, rgba(234,88,12,0.16) 0%, rgba(0,0,0,0) 70%)",
          }}
        />

        <div className="rivalry-head relative text-center">
          {edition && (
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-400">
              {edition}
            </p>
          )}
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {heading}{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
              like never before.
            </span>
          </h2>
        </div>

        {/* The face-off */}
        <div className="rivalry-arena relative mx-auto mt-10 grid max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mt-14 sm:gap-6">
          <div className="crest-left flex flex-col items-center text-center">
            {home.crest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={home.crest}
                alt={`${home.name} crest`}
                loading="lazy"
                decoding="async"
                width={208}
                height={208}
                className="h-32 w-32 object-contain mix-blend-screen sm:h-52 sm:w-52"
              />
            ) : (
              <span className="flex h-32 w-32 items-center justify-center rounded-full bg-white/[0.06] text-4xl font-black text-amber-400 ring-1 ring-white/10 sm:h-52 sm:w-52 sm:text-6xl">
                {home.name.charAt(0)}
              </span>
            )}
            <p className="mt-2 text-sm font-bold text-white sm:text-lg">{home.name}</p>
            {home.city && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80 sm:text-xs">
                {home.city}
              </p>
            )}
          </div>

          {/* Swords + VS */}
          <div className="relative flex flex-col items-center justify-center px-1 py-6 sm:px-4">
            <div className="relative flex items-end justify-center">
              <div className="-mr-3 sm:-mr-4">
                <Sword />
              </div>
              <div className="-ml-3 sm:-ml-4">
                <Sword flip />
              </div>

              <div
                aria-hidden
                className="clash-flash pointer-events-none absolute left-1/2 top-6 h-16 w-16 -translate-x-1/2 rounded-full opacity-0 sm:top-8"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.7) 40%, rgba(234,88,12,0) 70%)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 sm:top-16"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="clash-spark absolute h-1.5 w-1.5 rounded-full bg-amber-300 opacity-0"
                  />
                ))}
              </div>
            </div>

            <span className="rivalry-vs mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-base font-black tracking-tight text-white shadow-lg shadow-orange-900/50 ring-2 ring-white/20 sm:h-14 sm:w-14 sm:text-lg">
              VS
            </span>
          </div>

          <div className="crest-right flex flex-col items-center text-center">
            {away.crest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={away.crest}
                alt={`${away.name} crest`}
                loading="lazy"
                decoding="async"
                width={208}
                height={208}
                className="h-32 w-32 object-contain mix-blend-screen sm:h-52 sm:w-52"
              />
            ) : (
              <span className="flex h-32 w-32 items-center justify-center rounded-full bg-white/[0.06] text-4xl font-black text-red-400 ring-1 ring-white/10 sm:h-52 sm:w-52 sm:text-6xl">
                {away.name.charAt(0)}
              </span>
            )}
            <p className="mt-2 text-sm font-bold text-white sm:text-lg">{away.name}</p>
            {away.city && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80 sm:text-xs">
                {away.city}
              </p>
            )}
          </div>
        </div>

        {/* Tagline */}
        {tagline.length > 0 && (
          <p className="relative mt-10 text-center text-sm font-bold uppercase tracking-[0.25em] text-white/80 sm:mt-12 sm:text-base">
            {tagline.map((part, i) => (
              <span key={part} className="inline-block overflow-hidden pb-0.5 align-bottom">
                <span
                  className={`rivalry-word mx-1.5 inline-block sm:mx-2.5 ${
                    i === 1 ? "text-orange-400" : ""
                  }`}
                >
                  {part}
                </span>
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
