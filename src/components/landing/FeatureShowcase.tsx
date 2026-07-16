"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, SplitText);

// The centerpiece act: a sticky-scrub particle-morph story. The outer
// section is 400svh tall; a sticky viewport inside holds the WebGL cloud
// (FeatureMorphScene) that morphs seat map -> payment slip -> QR code ->
// gate while four terse copy blocks swap in sync. No ScrollTrigger pin —
// the page lives inside a backdrop-blur panel that traps position:fixed,
// so sticky + a scrubbed timeline over the outer section does the job.
// Reduced-motion (and no-JS) visitors get a static glass-card grid instead.

const FeatureMorphScene = dynamic(() => import("./FeatureMorphScene"), { ssr: false });

const iconClass = "h-8 w-8";

const SCENES = [
  {
    badge: "Booking",
    pill: "bg-orange-100/80 text-orange-700",
    title: "Interactive seat maps",
    line: "Pick a real numbered seat on a live grandstand map.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="4" width="7.5" height="7.5" rx="1.5" />
        <rect x="13" y="4" width="7.5" height="7.5" rx="1.5" />
        <rect x="3.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <path d="m14.5 17 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    badge: "Payments",
    pill: "bg-amber-100/80 text-amber-800",
    title: "Verified payments",
    line: "Every bank slip reviewed before a ticket exists.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" strokeLinecap="round" />
        <path d="m8.5 14.5 2 2 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    badge: "Tickets",
    pill: "bg-orange-100/80 text-orange-700",
    title: "Personal QR tickets",
    line: "Payment approved, QR in your inbox.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" strokeLinecap="round" />
        <path d="M4 12h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    badge: "Check-in",
    pill: "bg-red-100/80 text-red-700",
    title: "Gate scanning + live dashboard",
    line: "One scan at the gate. Organizers watch it live.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M11 18.5h2" strokeLinecap="round" />
        <path d="m9.5 10 2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const STATS = [
  { value: 3, suffix: "", label: "steps from seat to gate" },
  { value: 1, suffix: "", label: "QR scan to get in" },
  { value: 0, suffix: "", label: "apps or printouts needed" },
  { value: 100, suffix: "%", label: "payments verified by a human" },
];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True on the server and for motion-sensitive visitors — static grid then. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true
  );
}

/** Compact stat strip below the act — counts up when it scrolls in. */
function StatStrip() {
  return (
    <div className="px-4 pb-16 pt-8 sm:px-7 sm:pb-24">
      <dl className="feat-stats mx-auto grid max-w-5xl gap-3 rounded-3xl bg-white/30 p-4 shadow-lg shadow-orange-950/5 ring-1 ring-white/50 backdrop-blur-md sm:grid-cols-4 sm:p-5">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/40 px-4 py-5 text-center ring-1 ring-white/40">
            {/* Server-rendered final value: readable with JS disabled */}
            <dd
              className="feat-stat-num font-mono text-4xl font-bold tabular-nums tracking-tight text-black"
              data-value={s.value}
              data-suffix={s.suffix}
            >
              {s.value}
              {s.suffix}
            </dd>
            <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700/80">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function FeatureShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  // Server snapshot is "reduced", so no-JS visitors keep the static grid.
  const showAct = !usePrefersReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || !showAct) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    return runWhenPageVisible(() => {
      let split: SplitText | null = null;
      let disposed = false;

      const ctx = gsap.context(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const kicker = stage.querySelector<HTMLElement>(".morph-kicker");
        if (kicker) {
          gsap.from(kicker, {
            y: 14,
            autoAlpha: 0,
            duration: 0.5,
            ease: "power3.out",
            clearProps: "all",
            scrollTrigger: { trigger: stage, start: "top 75%", once: true },
          });
        }

        const mm = gsap.matchMedia();
        mm.add({ desktop: "(min-width: 640px)", mobile: "(max-width: 639px)" }, (mctx) => {
          const desktop = mctx.conditions?.desktop === true;
          const slide = desktop ? 40 : 24;
          const blocks = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll(".morph-copy"));
          const dots = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll(".morph-dot"));
          const railFill = stage.querySelector<HTMLElement>(".morph-rail-fill");
          const morphHead = stage.querySelector<HTMLElement>(".morph-head");

          gsap.set(blocks.slice(1), { autoAlpha: 0, y: slide });
          if (dots[0]) gsap.set(dots[0], { backgroundColor: "#ea580c", scale: 1.5 });
          if (railFill) gsap.set(railFill, { scaleX: 0 });

          // One scrubbed timeline over the outer 400svh section. Its 0..3
          // time axis mirrors the scene's uProgress: copy block i peaks
          // exactly when formation i is crisp.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          });
          if (railFill) {
            tl.to(railFill, { scaleX: 1, duration: 3, ease: "none" }, 0);
          }
          blocks.forEach((el, i) => {
            if (i > 0) {
              tl.to(el, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }, i - 0.36);
            }
            if (i < blocks.length - 1) {
              tl.to(el, { autoAlpha: 0, y: -slide, duration: 0.3, ease: "power2.in" }, i + 0.14);
            }
          });
          dots.forEach((dot, i) => {
            if (i > 0) {
              tl.to(dot, { backgroundColor: "#ea580c", scale: 1.5, duration: 0.12, ease: "none" }, i - 0.06);
            }
          });

          // Desktop only: the headline drifts up slightly through the act.
          if (desktop && morphHead) {
            tl.to(morphHead, { yPercent: -14, ease: "none", duration: 3 }, 0);
          }
        });

        // Stat counters count up once when the strip scrolls in.
        gsap.utils.toArray<HTMLElement>(".feat-stat-num").forEach((el) => {
          const end = Number(el.dataset.value ?? "0");
          const suffix = el.dataset.suffix ?? "";
          const counter = { n: 0 };
          gsap.to(counter, {
            n: end,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: ".feat-stats", start: "top 88%", once: true },
            onUpdate: () => {
              el.textContent = `${Math.round(counter.n)}${suffix}`;
            },
          });
        });
        gsap.from(".feat-stats > *", {
          y: 20,
          autoAlpha: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: { trigger: ".feat-stats", start: "top 88%", once: true },
        });

        // The act swaps in client-side (server renders the static grid),
        // so re-measure any triggers that saw the shorter layout.
        ScrollTrigger.refresh();
      }, root);

      // SplitText only after fonts settle so word metrics are final.
      document.fonts.ready.then(() => {
        if (disposed) return;
        ctx.add(() => {
          const headline = headlineRef.current;
          const stage = stageRef.current;
          if (!headline || !stage) return;
          split = SplitText.create(headline, { type: "words", mask: "words", aria: "auto" });
          // bg-clip-text doesn't survive splitting — re-apply per word.
          const accent = headline.querySelector(".morph-accent");
          if (accent) {
            for (const word of split.words) {
              if (accent.contains(word)) {
                word.classList.add(
                  "bg-gradient-to-r",
                  "from-orange-600",
                  "via-orange-500",
                  "to-red-500",
                  "bg-clip-text",
                  "text-transparent"
                );
              }
            }
          }
          gsap.from(split.words, {
            yPercent: 120,
            duration: 0.85,
            stagger: 0.06,
            ease: "power3.out",
            scrollTrigger: { trigger: stage, start: "top 75%", once: true },
          });
        });
      });

      return () => {
        disposed = true;
        ctx.revert();
        split?.revert();
      };
    });
  }, [showAct]);

  return (
    <div ref={ref} key={showAct ? "act" : "grid"}>
      {showAct ? (
        <section ref={stageRef} id="features" className="relative h-[400svh] scroll-mt-24">
          <div className="sticky top-0 flex h-svh items-center overflow-hidden w-full">
            {/* CSS wash fallback — always painted; the canvas fades in above */}
            <div
              aria-hidden
              className="absolute inset-0 md:left-0 md:right-auto md:w-1/2 md:h-full md:flex md:items-center md:justify-center"
              style={{
                background:
                  "radial-gradient(80% 60% at 50% 58%, rgba(251,146,60,0.18) 0%, rgba(251,191,36,0.08) 45%, rgba(247,244,240,0) 75%)",
              }}
            >
              <FeatureMorphScene />
            </div>

            <div className="relative z-10 w-full h-full flex flex-col md:grid md:grid-cols-12 md:gap-12 items-center max-w-7xl mx-auto px-6 sm:px-8 py-12">
              {/* Empty spacer column on desktop (left 50% of screen holds the canvas) */}
              <div className="hidden md:block md:col-span-6" />

              {/* Content column (right 50% of screen holds the text on desktop) */}
              <div className="col-span-12 md:col-span-6 flex flex-col justify-between md:justify-center h-full w-full py-8 md:py-24 text-center md:text-left">
                {/* Act header */}
                <div className="morph-head pointer-events-none relative w-full">
                  <p className="morph-kicker text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                    What Attendly does
                  </p>
                  <h2 ref={headlineRef} className="morph-headline mt-3 text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-black">
                    From &ldquo;I want to go&rdquo;{" "}
                    <span className="morph-accent bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent block lg:inline">
                      to &ldquo;you&rsquo;re in.&rdquo;
                    </span>
                  </h2>
                </div>

                {/* Scene copy blocks, stacked and swapped by the scrub */}
                <div className="pointer-events-none relative mt-8 md:mt-10 w-full h-40">
                  {SCENES.map((s, i) => (
                    <div key={s.title} className="morph-copy absolute inset-x-0 top-0 text-center md:text-left">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${s.pill}`}
                      >
                        <span className="font-mono">{`0${i + 1}`}</span>
                        {s.badge}
                      </span>
                      <h3 className="mt-3 text-xl font-bold tracking-tight text-black sm:text-2xl lg:text-3xl">
                        {s.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-700 sm:text-base leading-relaxed max-w-md mx-auto md:mx-0">
                        {s.line}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Progress rail */}
                <div aria-hidden className="relative mt-6 h-px w-44 bg-black/10 mx-auto md:mx-0">
                  <div className="morph-rail-fill absolute inset-0 origin-left bg-orange-600" />
                  {SCENES.map((s, i) => (
                    <span
                      key={s.title}
                      className="morph-dot absolute top-1/2 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-black/15"
                      style={{ left: `${(i / (SCENES.length - 1)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section ref={stageRef} id="features" className="scroll-mt-24 px-4 pb-4 pt-24 sm:px-7 sm:pt-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              What Attendly does
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-4xl">
              From &ldquo;I want to go&rdquo;{" "}
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                to &ldquo;you&rsquo;re in.&rdquo;
              </span>
            </h2>
            <p className="mt-3 text-sm text-black sm:text-base">
              Seats, payments, tickets, check-in — one flow.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {SCENES.map((s) => (
              <div
                key={s.title}
                className="relative overflow-hidden rounded-2xl bg-white/40 p-6 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md transition-colors hover:bg-white/55"
              >
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${s.pill}`}
                >
                  {s.badge}
                </span>
                <div aria-hidden className="mt-4 text-orange-600">
                  {s.icon}
                </div>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-black">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-black">{s.line}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <StatStrip />
    </div>
  );
}
