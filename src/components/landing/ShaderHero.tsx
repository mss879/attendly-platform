"use client";

import gsap from "gsap";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { runWhenPageVisible } from "@/lib/motion";

// Platform hero. The headline, CTAs and marquee are plain DOM (rendered
// immediately); the WebGL layer — silk shader + 3D tickets + particles —
// lives in HeroScene and is code-split so three.js never blocks first
// paint. With reduced motion (or no WebGL) the CSS gradient fallback and
// static text remain.

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** Masked-rise word: the outer span clips, the inner `.hero-word` slides up. */
function Word({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-1 align-bottom">
      <span
        className={`hero-word inline-block ${
          accent
            ? "bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent"
            : ""
        }`}
      >
        {children}
      </span>
    </span>
  );
}

const MARQUEE_ITEMS = [
  "Interactive seat maps",
  "Bank-transfer payments",
  "Slip verification",
  "QR tickets by email",
  "Gate scanning",
  "Live organizer dashboard",
];

function MarqueeRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <span aria-hidden={hidden} className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item) => (
        <Fragment key={item}>
          <span className="whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.25em] text-orange-800/60 sm:px-6">
            {item}
          </span>
          <span aria-hidden className="text-orange-500/70">
            ✦
          </span>
        </Fragment>
      ))}
    </span>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True on the server and for motion-sensitive visitors — no 3D scene then. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true
  );
}

export function ShaderHero() {
  const ref = useRef<HTMLElement>(null);
  const showScene = !usePrefersReducedMotion();

  // GSAP choreography: entrance, magnetic CTAs, marquee loop. Deferred
  // until the page is visible (runWhenPageVisible) so gsap.from() can never
  // strand the headline hidden in a background tab.
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-badge", { y: 16, autoAlpha: 0, duration: 0.5, clearProps: "all" })
          .from(
            ".hero-word",
            { yPercent: 120, duration: 0.85, stagger: 0.07, clearProps: "all" },
            "-=0.25"
          )
          .from(".hero-sub", { y: 18, autoAlpha: 0, duration: 0.6, clearProps: "all" }, "-=0.45")
          .from(
            ".hero-cta",
            { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.08, clearProps: "all" },
            "-=0.35"
          )
          .from(".hero-marquee", { autoAlpha: 0, duration: 0.6 }, "-=0.4");

        // Magnetic CTAs: the buttons lean toward the cursor and snap back.
        gsap.utils.toArray<HTMLElement>(".hero-cta a").forEach((el) => {
          const toX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
          const toY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
          el.addEventListener("pointermove", (e) => {
            const r = el.getBoundingClientRect();
            toX(((e.clientX - r.left) / r.width - 0.5) * 10);
            toY(((e.clientY - r.top) / r.height - 0.5) * 8);
          });
          el.addEventListener("pointerleave", () => {
            toX(0);
            toY(0);
          });
        });

        // Seamless marquee: the track holds two copies, loop by half.
        gsap.to(".hero-marquee-track", {
          xPercent: -50,
          ease: "none",
          duration: 26,
          repeat: -1,
        });
      }, section);
      return () => ctx.revert();
    });
  }, []);

  return (
    <section
      ref={ref}
      className="relative flex h-[calc(100svh_-_1rem)] flex-col overflow-hidden rounded-t-2xl text-center sm:rounded-t-[28px]"
    >
      {/* CSS gradient fallback — always painted; the WebGL scene fades in above it */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(90% 70% at 50% 115%, #ee6a29 0%, #f9974f 32%, #fcd9b3 62%, #f7f4f0 100%)",
        }}
      >
        {showScene && <HeroScene />}
      </div>
      {/* Soft veil so text always sits on readable cream */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-2/3"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,244,240,0.92) 0%, rgba(247,244,240,0.55) 55%, rgba(247,244,240,0) 100%)",
        }}
      />

      {/* Nav rides on the hero backdrop, no seam under it */}
      <div className="relative z-20">
        <PublicHeader />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-6">
        <span className="hero-badge inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          The event ticketing platform
        </span>

        {/* Fluid type: scales with viewport height and width so the hero's
            content always fits one screen — short laptop windows included. */}
        <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.25rem,min(8.5svh,10vw),4.5rem)] font-bold leading-[1.08] tracking-tight text-black">
          <Word>Every</Word> <Word>event.</Word> <Word accent>One</Word>{" "}
          <Word accent>ticket.</Word> <Word accent>One</Word> <Word accent>scan.</Word>
        </h1>

        <p className="hero-sub mx-auto mt-4 max-w-xl text-base text-black sm:text-lg">
          {/* Phones get the short cut — the full pitch reads text-heavy there */}
          <span className="sm:hidden">
            Pick your seat on a live map, get your QR ticket, walk in with one
            scan.
          </span>
          <span className="hidden sm:inline">
            Attendly turns any event into a seamless experience — attendees
            pick numbered seats on a live map and walk in with a personal QR
            ticket. Organizers watch it all happen from one dashboard.
          </span>
        </p>

        {/* Phones: equal-width buttons side by side; sm+: hug their labels */}
        <div className="mx-auto mt-7 flex w-full max-w-md items-center justify-center gap-2.5 sm:w-auto sm:max-w-none sm:flex-wrap sm:gap-3">
          <span className="hero-cta block min-w-0 flex-1 sm:flex-none">
            <Link
              href="/events"
              className="group block w-full whitespace-nowrap rounded-full bg-orange-600 px-2 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition-colors hover:bg-orange-700 sm:inline-block sm:w-auto sm:px-8"
            >
              Find your event
              <span className="ml-1.5 inline-block transition group-hover:translate-x-0.5">→</span>
            </Link>
          </span>
          <span className="hero-cta block min-w-0 flex-1 sm:flex-none">
            <Link
              href="/host"
              className="block w-full whitespace-nowrap rounded-full bg-white/80 px-2 py-3.5 text-center text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition-colors hover:bg-white sm:inline-block sm:w-auto sm:px-8"
            >
              Host your event
            </Link>
          </span>
        </div>

        <p className="hero-cta mt-12 hidden text-xs font-bold text-black/80 sm:block">
          No apps to install · No printouts · Verified payments before every ticket
        </p>
      </div>

      {/* Feature marquee pinned to the hero's bottom edge */}
      <div className="hero-marquee relative overflow-hidden border-t border-white/40 bg-white/25 py-3 backdrop-blur-sm">
        <div className="hero-marquee-track flex w-max items-center">
          <MarqueeRow />
          <MarqueeRow hidden />
        </div>
      </div>

      {/* Phones: keep the marquee clear of the app-style bottom tab bar */}
      <div aria-hidden className="h-24 sm:hidden" />
    </section>
  );
}
