"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactElement } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Dark finale act: a stadium-night slab floating in the cream shell. The
// WebGL beams (HostScene) are code-split so three.js stays off the main
// bundle; reduced-motion and no-WebGL visitors keep the radial-glow CSS
// background underneath.

const HostScene = dynamic(() => import("./HostScene"), { ssr: false });

function ChipIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 shrink-0 text-amber-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const CHIPS: { label: string; icon: ReactElement }[] = [
  {
    label: "Your own event page",
    icon: (
      <ChipIcon>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M3 9h18" />
        <path d="M6.5 6.5h.01" />
      </ChipIcon>
    ),
  },
  {
    label: "Numbered seat maps",
    icon: (
      <ChipIcon>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </ChipIcon>
    ),
  },
  {
    label: "Payments to your bank",
    icon: (
      <ChipIcon>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </ChipIcon>
    ),
  },
  {
    label: "QR gate scanning",
    icon: (
      <ChipIcon>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <path d="M14 14h3v3h-3z" />
        <path d="M20 17v3h-3" />
      </ChipIcon>
    ),
  },
];

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

export function HostCta() {
  const ref = useRef<HTMLElement>(null);
  const showScene = !usePrefersReducedMotion();

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    return runWhenPageVisible(() => {
      let split: SplitText | null = null;
      let cancelled = false;
      const mm = gsap.matchMedia();

      const ctx = gsap.context(() => {
        const panel = section.querySelector<HTMLElement>(".host-panel");
        if (panel) {
          // The slab inflates into place as it enters — scale + corner ease
          // scrubbed against the section (no pin: the page shell traps fixed).
          gsap.fromTo(
            panel,
            { scale: 0.96, borderRadius: "3.5rem" },
            {
              scale: 1,
              borderRadius: "2.5rem",
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top 85%",
                end: "top 30%",
                scrub: 0.5,
              },
            }
          );
        }

        // Slow glow pulse on the CTA pill.
        gsap.fromTo(
          ".host-cta-btn",
          { boxShadow: "0 10px 26px -8px rgba(234,88,12,0.5), 0 0 0 0 rgba(249,115,22,0)" },
          {
            boxShadow:
              "0 10px 26px -8px rgba(234,88,12,0.5), 0 0 36px 5px rgba(249,115,22,0.4)",
            duration: 1.9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          }
        );
      }, section);

      // Magnetic CTA — fine pointers only, so touch scrolling never fights it.
      mm.add("(hover: hover) and (pointer: fine)", () => {
        const btn = section.querySelector<HTMLElement>(".host-cta-btn");
        if (!btn) return;
        const toX = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
        const toY = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          toX(((e.clientX - r.left) / r.width - 0.5) * 12);
          toY(((e.clientY - r.top) / r.height - 0.5) * 8);
        };
        const onLeave = () => {
          toX(0);
          toY(0);
        };
        btn.addEventListener("pointermove", onMove);
        btn.addEventListener("pointerleave", onLeave);
        return () => {
          btn.removeEventListener("pointermove", onMove);
          btn.removeEventListener("pointerleave", onLeave);
        };
      });

      // Split after fonts settle so char metrics are final.
      document.fonts.ready.then(() => {
        if (cancelled) return;
        ctx.add(() => {
          const title = section.querySelector<HTMLElement>(".host-title");
          const panel = section.querySelector<HTMLElement>(".host-panel");
          if (!title || !panel) return;

          // words,chars: words wrap as units so resizes never break mid-word.
          split = SplitText.create(title, {
            type: "words,chars",
            charsClass: "host-char",
            aria: "auto",
          });

          // bg-clip-text gradients don't survive per-char splitting — paint
          // each accent char along the same amber-to-red ramp instead.
          const accent = title.querySelector<HTMLElement>(".host-title-accent");
          if (accent) {
            accent.style.backgroundImage = "none";
            const chars = accent.querySelectorAll<HTMLElement>(".host-char");
            const ramp = gsap.utils.interpolate(["#fcd34d", "#fb923c", "#ef4444"]);
            chars.forEach((c, i) => {
              c.style.color = ramp(chars.length > 1 ? i / (chars.length - 1) : 0.5);
            });
          }

          // Entrance: beams fade up, chars rise, chips cascade, CTA pops last.
          const tl = gsap.timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: { trigger: panel, start: "top 70%" },
          });
          tl.from(".host-scene", { autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 0)
            .from(".host-kicker", { y: 14, autoAlpha: 0, duration: 0.5, clearProps: "all" }, 0.05)
            .from(split.chars, { yPercent: 120, autoAlpha: 0, duration: 0.7, stagger: 0.025 }, 0.1)
            .from(".host-sub", { y: 16, autoAlpha: 0, duration: 0.55, clearProps: "all" }, "-=0.4")
            .from(
              ".host-chip",
              {
                y: 20,
                autoAlpha: 0,
                scale: 0.8,
                duration: 0.5,
                stagger: 0.07,
                ease: "back.out(2)",
                clearProps: "all",
              },
              "-=0.3"
            )
            .from(
              ".host-cta-wrap",
              { y: 18, autoAlpha: 0, scale: 0.9, duration: 0.6, ease: "back.out(1.7)", clearProps: "all" },
              "-=0.1"
            )
            .from(".host-trust", { autoAlpha: 0, duration: 0.5, clearProps: "all" }, "-=0.3");
        });
      });

      return () => {
        cancelled = true;
        mm.revert();
        ctx.revert();
        split?.revert();
      };
    });
  }, []);

  return (
    <section ref={ref} id="host" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <div className="host-panel relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-16 text-center sm:px-10">
        {/* CSS fallback glow — the WebGL beams fade in above it */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(55% 65% at 25% 30%, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0) 70%), radial-gradient(55% 65% at 75% 70%, rgba(234,88,12,0.28) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
        {showScene && (
          <div aria-hidden className="host-scene absolute inset-0">
            <HostScene />
          </div>
        )}

        <div className="relative mx-auto max-w-4xl">
          <p className="host-kicker text-[11px] font-bold uppercase tracking-[0.3em] text-orange-400">
            For organizers
          </p>

          <h2 className="host-title mx-auto mt-5 text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-white">
            Run your event on{" "}
            <span className="host-title-accent bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Attendly.
            </span>
          </h2>

          <p className="host-sub mx-auto mt-5 max-w-md text-base text-white/70 sm:text-lg">
            Apply in minutes. Go live once approved.
          </p>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            {CHIPS.map((chip) => (
              <li
                key={chip.label}
                className="host-chip inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur-sm"
              >
                {chip.icon}
                {chip.label}
              </li>
            ))}
          </ul>

          <div className="host-cta-wrap mt-10">
            <Link
              href="/host"
              className="host-cta-btn group inline-block rounded-full bg-orange-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-orange-600/40 transition-colors hover:bg-orange-500"
            >
              Host your event
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          <p className="host-trust mt-5 text-xs font-semibold uppercase tracking-wider text-white/50">
            Free to apply · Reviewed by the Attendly team
          </p>
        </div>
      </div>
    </section>
  );
}
