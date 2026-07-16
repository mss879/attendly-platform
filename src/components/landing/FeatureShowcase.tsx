"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

// What the platform does, in the same glass-card language as the event
// pages: DrawSVG icons sketch themselves in, cards drift on a light
// parallax, and the stat strip counts itself up.

const iconClass = "h-8 w-8";

const features = [
  {
    title: "Interactive seat maps",
    text: "Attendees pick real numbered seats on a live grandstand plan — taken seats grey out in real time, no double bookings ever.",
    badge: "Booking",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.35) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect className="feat-draw" x="3.5" y="4" width="7.5" height="7.5" rx="1.5" />
        <rect className="feat-draw" x="13" y="4" width="7.5" height="7.5" rx="1.5" />
        <rect className="feat-draw" x="3.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <path className="feat-draw" d="m14.5 17 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Verified payments",
    text: "Bank transfer + payment-slip upload. Organizers review every slip before a single ticket is issued — no payment gateway fees.",
    badge: "Payments",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(245,158,11,0.28) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-amber-100/80 text-amber-800",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect className="feat-draw" x="3" y="6" width="18" height="12" rx="2" />
        <path className="feat-draw" d="M3 10h18" strokeLinecap="round" />
        <path className="feat-draw" d="m8.5 14.5 2 2 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Personal QR tickets",
    text: "Once payment is verified, a QR ticket lands in the attendee's inbox — plus a personal page to track everything.",
    badge: "Tickets",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(234,88,12,0.25) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path className="feat-draw" d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" strokeLinecap="round" />
        <path className="feat-draw" d="M4 12h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Gate scanning",
    text: "Staff scan tickets with any phone. Duplicates flash red instantly — the same ticket can never enter twice.",
    badge: "Check-in",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(249,115,22,0.28) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect className="feat-draw" x="7" y="2.5" width="10" height="19" rx="2" />
        <path className="feat-draw" d="M11 18.5h2" strokeLinecap="round" />
        <path className="feat-draw" d="m9.5 10 2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Live dashboard",
    text: "Registrations, payment reviews and check-in counts in one place — organizers always know exactly who's in.",
    badge: "Organizers",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(220,38,38,0.18) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-red-100/80 text-red-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path className="feat-draw" d="M4 19.5h16" strokeLinecap="round" />
        <path className="feat-draw" d="M6.5 19.5v-6M12 19.5v-11M17.5 19.5v-8.5" strokeLinecap="round" />
        <path className="feat-draw" d="m5 8 4-3 4 2.5L19 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Your own event page",
    text: "Every event gets its own animated page with a live countdown, schedule and booking — hosted at attendly.buzz.",
    badge: "Platform",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.30) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle className="feat-draw" cx="12" cy="12" r="8.5" />
        <path className="feat-draw" d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5S9.5 5.8 12 3.5Z" />
      </svg>
    ),
  },
];

const stats = [
  { value: 3, suffix: "", label: "steps from seat to gate" },
  { value: 1, suffix: "", label: "QR scan to get in" },
  { value: 0, suffix: "", label: "apps or printouts needed" },
  { value: 100, suffix: "%", label: "payments verified by a human" },
];

export function FeatureShowcase() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".feat-head", {
        y: 24,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: ".feat-head", start: "top 85%" },
      });

      gsap.utils.toArray<HTMLElement>(".feat-card").forEach((card, i) => {
        const trigger = { trigger: card, start: "top 85%" };
        gsap.fromTo(
          card,
          { y: 40, autoAlpha: 0, scale: 0.96 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.7,
            delay: (i % 3) * 0.08,
            ease: "power3.out",
            scrollTrigger: trigger,
            clearProps: "all",
          }
        );
        gsap.fromTo(
          card.querySelectorAll(".feat-draw"),
          { drawSVG: "0%" },
          {
            drawSVG: "100%",
            duration: 0.9,
            delay: 0.2 + (i % 3) * 0.08,
            stagger: 0.1,
            ease: "power2.inOut",
            scrollTrigger: trigger,
          }
        );
      });

      // Depth: alternate columns drift at slightly different speeds.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 640px)", () => {
        gsap.utils.toArray<HTMLElement>(".feat-card").forEach((card, i) => {
          gsap.to(card, {
            yPercent: i % 2 ? -4 : 4,
            ease: "none",
            scrollTrigger: {
              trigger: ".feat-grid",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          });
        });
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
          scrollTrigger: { trigger: ".feat-stats", start: "top 88%" },
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
        scrollTrigger: { trigger: ".feat-stats", start: "top 88%" },
        clearProps: "all",
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} id="features" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <div className="feat-head mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          What Attendly does
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-4xl">
          Everything between &ldquo;I want to go&rdquo; and &ldquo;you&apos;re in&rdquo;
        </h2>
        <p className="mt-3 text-sm text-black sm:text-base">
          One platform carries the whole journey — seat selection, payment
          verification, QR ticketing and gate check-in — for every event it hosts.
        </p>
      </div>

      <div className="feat-grid mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="feat-card relative overflow-hidden rounded-2xl bg-white/40 p-6 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md transition-all duration-300 hover:bg-white/55 hover:shadow-xl hover:shadow-orange-950/5"
          >
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: f.wash }} />
            <div className="relative">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${f.pill}`}>
                {f.badge}
              </span>
              <div aria-hidden className="mt-4 text-orange-600">
                {f.icon}
              </div>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-black">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-black">{f.text}</p>
            </div>
          </div>
        ))}
      </div>

      <dl className="feat-stats mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl bg-white/30 p-4 shadow-lg shadow-orange-950/5 ring-1 ring-white/50 backdrop-blur-md sm:grid-cols-4 sm:p-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white/40 px-4 py-4 text-center ring-1 ring-white/40">
            <dd
              className="feat-stat-num font-mono text-3xl font-bold tabular-nums tracking-tight text-black"
              data-value={s.value}
              data-suffix={s.suffix}
            >
              0{s.suffix}
            </dd>
            <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700/80">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
