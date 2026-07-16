"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, SplitText);

// The journey act: one tall scroll-driven route. An S-curve path draws
// itself down the section (DrawSVG, scrubbed) while a small ticket chip
// rides the drawn tip (MotionPath, same timeline). Three glass stations
// pop as the chip approaches. Everything is authored in SSR-final state —
// with JS or motion off the route is fully drawn and the cards visible.
//
// Two hand-authored SVGs (desktop / mobile) are swapped by breakpoint;
// gsap.matchMedia animates whichever is visible. Both share station Y
// fractions (330/800/1270 of 1600) so HTML nodes and cards can sit exactly
// on the path via percentage positioning — the SVGs stretch with
// preserveAspectRatio="none", and percentages map 1:1 to viewBox coords.
// No vector-effect on the animated stroke: DrawSVG percentages must stay
// in user space so the tip and the MotionPath chip never drift apart.

const D_DESKTOP =
  "M 500 40 C 500 190 250 180 250 330 C 250 480 750 620 750 800 C 750 980 250 1090 250 1270 C 250 1420 500 1440 500 1560";
const D_MOBILE =
  "M 200 40 C 200 190 130 180 130 330 C 130 480 270 620 270 800 C 270 980 130 1090 130 1270 C 130 1420 200 1440 200 1560";

const STATIONS = [
  {
    badge: "Step 1",
    title: "Find your event",
    line: "Browse what's on, pick numbered seats on the live map.",
    numeral: "1",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.35) 0%, rgba(255,255,255,0) 55%)",
    node: "left-[32.5%] top-[20.625%] md:left-[25%]",
    wrap: "left-0 right-0 top-[20.625%] pt-9 md:left-[30%] md:right-auto md:w-[34%] md:-translate-y-1/2 md:pt-0",
    ghost: "-top-16 left-4 z-20 md:-top-20 md:left-auto md:right-full md:mr-8 md:z-10",
  },
  {
    badge: "Step 2",
    title: "Pay & upload the slip",
    line: "Bank transfer in, payment slip verified by a human.",
    numeral: "2",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(245,158,11,0.28) 0%, rgba(255,255,255,0) 55%)",
    node: "left-[67.5%] top-[50%] md:left-[75%]",
    wrap: "left-0 right-0 top-[50%] pt-9 md:left-auto md:right-[30%] md:w-[34%] md:-translate-y-1/2 md:pt-0",
    ghost: "-top-16 right-4 z-20 md:-top-20 md:right-auto md:left-full md:ml-8 md:z-10",
  },
  {
    badge: "Step 3",
    title: "Scan in at the gate",
    line: "Your QR lands by email. One scan and you're in.",
    numeral: "3",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(234,88,12,0.25) 0%, rgba(255,255,255,0) 55%)",
    node: "left-[32.5%] top-[79.375%] md:left-[25%]",
    wrap: "left-0 right-0 top-[79.375%] pt-9 md:left-[30%] md:right-auto md:w-[34%] md:-translate-y-1/2 md:pt-0",
    ghost: "-top-16 left-4 z-20 md:-top-20 md:left-auto md:right-full md:mr-8 md:z-10",
  },
];

function RouteSvg({
  className,
  viewBox,
  gradientId,
  d,
}: {
  className: string;
  viewBox: string;
  gradientId: string;
  d: string;
}) {
  return (
    <svg
      aria-hidden
      className={`${className} absolute inset-0 h-full w-full`}
      viewBox={viewBox}
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="1600"
        >
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.55" stopColor="#ea580c" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* dashed ghost track — the route's shadow, always fully visible */}
      <path
        d={d}
        stroke="#431407"
        strokeOpacity="0.12"
        strokeWidth="2.5"
        strokeDasharray="3 13"
        strokeLinecap="round"
      />
      <path
        className="route-draw"
        d={d}
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The traveler: a tiny ticket chip that rides the route. */
function TravelerChip() {
  // Resting (no-JS) spot is the route's end: (50%, 97.5%) in both viewBoxes.
  return (
    <div
      aria-hidden
      className="how-traveler pointer-events-none absolute left-1/2 top-[97.5%] z-20 -ml-[38px] -mt-[17px] h-[34px] w-[76px]"
    >
      <svg
        viewBox="0 0 76 34"
        className="h-full w-full"
        style={{ filter: "drop-shadow(0 8px 16px rgba(234,88,12,0.35))" }}
      >
        <rect x="2" y="2" width="72" height="30" rx="9" fill="#f97316" stroke="#ffffff" strokeWidth="2.5" />
        <line x1="50" y1="6" x2="50" y2="28" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2.5 3.5" opacity="0.85" />
        <rect x="9" y="9" width="26" height="4" rx="2" fill="#ffedd5" />
        <rect x="9" y="16" width="18" height="4" rx="2" fill="#ffedd5" opacity="0.75" />
        <rect x="9" y="23" width="12" height="3" rx="1.5" fill="#ffedd5" opacity="0.55" />
        <rect x="56" y="8" width="4" height="4" fill="#ffffff" />
        <rect x="62" y="8" width="4" height="4" fill="#ffffff" opacity="0.85" />
        <rect x="68" y="8" width="3" height="3" fill="#ffffff" opacity="0.6" />
        <rect x="56" y="15" width="3" height="3" fill="#ffffff" opacity="0.7" />
        <rect x="61" y="14" width="5" height="5" fill="#ffffff" />
        <rect x="68" y="15" width="3" height="3" fill="#ffffff" opacity="0.85" />
        <rect x="56" y="22" width="4" height="4" fill="#ffffff" opacity="0.9" />
        <rect x="63" y="22" width="3" height="3" fill="#ffffff" opacity="0.65" />
        <rect x="68" y="21" width="4" height="4" fill="#ffffff" />
      </svg>
    </div>
  );
}

export function HowItWorksPlatform() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      let split: SplitText | null = null;
      let disposed = false;
      let mm: ReturnType<typeof gsap.matchMedia> | null = null;

      const ctx = gsap.context(() => {
        const headTrigger = { trigger: ".how-head", start: "top 85%" };
        gsap.from(".how-kicker", {
          y: 14,
          autoAlpha: 0,
          duration: 0.5,
          ease: "power3.out",
          scrollTrigger: headTrigger,
          clearProps: "all",
        });
        gsap.from(".how-sub", {
          y: 16,
          autoAlpha: 0,
          duration: 0.6,
          delay: 0.2,
          ease: "power3.out",
          scrollTrigger: headTrigger,
          clearProps: "all",
        });

        // Split only after webfonts settle so line masks measure true boxes.
        document.fonts.ready.then(() => {
          if (disposed) return;
          ctx.add(() => {
            const headline = section.querySelector<HTMLElement>(".how-headline");
            if (!headline) return;
            split = SplitText.create(headline, { type: "lines", mask: "lines", aria: "auto" });
            gsap.from(split.lines, {
              yPercent: 120,
              duration: 0.95,
              stagger: 0.12,
              ease: "power4.out",
              scrollTrigger: { trigger: headline, start: "top 84%" },
            });
          });
        });

        // Station pop + node flip. Nodes are indexed siblings of the list.
        const nodes = gsap.utils.toArray<HTMLElement>(".how-node");
        gsap.utils.toArray<HTMLElement>(".how-station").forEach((station, i) => {
          const card = station.querySelector<HTMLElement>(".how-card");
          if (!card) return;
          const tl = gsap.timeline({
            scrollTrigger: { trigger: station, start: "top 78%" },
          });
          tl.fromTo(
            card,
            { y: 46, scale: 0.92, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.7, ease: "back.out(1.7)", clearProps: "all" }
          );
          const node = nodes[i] as HTMLElement | undefined;
          const fill = node?.querySelector(".node-fill");
          const pulse = node?.querySelector(".node-pulse");
          if (fill) {
            tl.fromTo(fill, { scale: 0 }, { scale: 1, duration: 0.45, ease: "back.out(2.5)" }, 0.08);
          }
          if (pulse) {
            tl.fromTo(
              pulse,
              { scale: 0.4, autoAlpha: 0.9 },
              { scale: 2.4, autoAlpha: 0, duration: 0.9, ease: "power2.out" },
              0.08
            );
          }
        });

        gsap.from(".how-close", {
          y: 18,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: ".how-close", start: "top 92%" },
          clearProps: "all",
        });

        // Route draw + traveler share one scrubbed timeline (same duration,
        // same linear ease) so the chip always sits on the drawn tip.
        const buildRoute = (svgClass: string) => {
          const journey = section.querySelector<HTMLElement>(".how-journey");
          const route = section.querySelector<SVGPathElement>(`.${svgClass} .route-draw`);
          const traveler = section.querySelector<HTMLElement>(".how-traveler");
          if (!journey || !route || !traveler) return;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: journey,
              start: "top 70%",
              end: "bottom 72%",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
          tl.fromTo(route, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", ease: "none", duration: 1 }, 0);
          tl.to(
            traveler,
            {
              motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], autoRotate: true },
              ease: "none",
              duration: 1,
            },
            0
          );
        };

        // Ghost numerals drift against the scroll, each at its own rate.
        const ghostDrift = (amp: number) => {
          gsap.utils.toArray<HTMLElement>(".how-ghost").forEach((ghost, i) => {
            const rate = amp * (1 + (i % 3) * 0.4);
            gsap.fromTo(
              ghost,
              { yPercent: rate },
              {
                yPercent: -rate,
                ease: "none",
                scrollTrigger: {
                  trigger: ghost.closest(".how-station") ?? ghost,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
          });
        };

        mm = gsap.matchMedia();
        mm.add("(min-width: 768px)", () => {
          buildRoute("how-svg-d");
          ghostDrift(26);
        });
        mm.add("(max-width: 767px)", () => {
          buildRoute("how-svg-m");
          ghostDrift(12);
        });
      }, section);

      return () => {
        disposed = true;
        mm?.revert();
        ctx.revert();
        split?.revert();
      };
    });
  }, []);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden px-4 py-16 sm:px-7 sm:py-24"
    >
      <div className="how-head mx-auto max-w-3xl text-center">
        <p className="how-kicker text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          How it works
        </p>
        <h2
          aria-label="Three steps to any gate."
          className="how-headline mt-3 text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.08] tracking-tight text-black"
        >
          Three steps to any gate.
        </h2>
        <p className="how-sub mt-4 text-sm font-semibold text-black sm:text-base">
          One route from browse to gate — follow the line down.
        </p>
      </div>

      <div className="how-journey relative mx-auto mt-12 min-h-[220svh] max-w-5xl sm:mt-16">
        <RouteSvg
          className="how-svg-d hidden md:block"
          viewBox="0 0 1000 1600"
          gradientId="how-route-grad-d"
          d={D_DESKTOP}
        />
        <RouteSvg
          className="how-svg-m md:hidden"
          viewBox="0 0 400 1600"
          gradientId="how-route-grad-m"
          d={D_MOBILE}
        />

        {/* Station nodes: sit exactly on the path (percentages = viewBox coords) */}
        {STATIONS.map((s) => (
          <div
            key={s.badge}
            aria-hidden
            className={`how-node absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 md:h-6 md:w-6 ${s.node}`}
          >
            <span className="node-pulse absolute -inset-2 rounded-full border-2 border-orange-500 opacity-0" />
            <span className="absolute inset-0 rounded-full border-2 border-orange-400 bg-[#f7f4f0] shadow-md shadow-orange-600/20" />
            <span className="node-fill absolute inset-[4px] rounded-full bg-gradient-to-br from-orange-500 to-red-600" />
          </div>
        ))}

        <ol className="absolute inset-0">
          {STATIONS.map((s) => (
            <li key={s.badge} className={`how-station absolute ${s.wrap}`}>
              <span
                aria-hidden
                className={`how-ghost pointer-events-none absolute select-none text-[9rem] font-bold leading-none text-orange-950/[0.05] md:text-[14rem] ${s.ghost}`}
              >
                {s.numeral}
              </span>
              <div className="how-card relative z-10 overflow-hidden rounded-3xl bg-white/40 p-5 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-white/55 hover:shadow-xl md:p-7">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ background: s.wash }}
                />
                <div className="relative">
                  <span className="inline-flex rounded-full bg-orange-100/80 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                    {s.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-black md:text-2xl">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-black">{s.line}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <TravelerChip />
      </div>

      <p className="how-close mt-12 text-center text-base font-bold text-black">
        Ready when you are —{" "}
        <Link
          href="/events"
          className="text-orange-700 underline decoration-orange-300 decoration-2 underline-offset-4 transition-colors hover:text-orange-800"
        >
          find your next event
        </Link>
      </p>
    </section>
  );
}
