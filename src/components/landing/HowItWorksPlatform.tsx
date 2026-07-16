"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

// Attendee journey, platform edition — same progress-line choreography as
// the per-event HowItWorks, with platform-level copy.

const iconClass = "h-7 w-7";

const steps = [
  {
    title: "Find your event",
    text: "Browse upcoming events, open the one you love and watch the countdown tick — then pick your numbered seats on the live map.",
    badge: "Step 1",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.35) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle className="step-draw" cx="11" cy="11" r="6.5" />
        <path className="step-draw" d="m16 16 4.5 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Pay & upload the slip",
    text: "Transfer the ticket fee to the organizer's bank account and upload your payment slip — the organizers verify it personally.",
    badge: "Step 2",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(245,158,11,0.28) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path className="step-draw" d="M12 15.5V5" strokeLinecap="round" />
        <path className="step-draw" d="m7.5 9.5 4.5-4.5 4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path className="step-draw" d="M4.5 15v3A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Scan in at the gate",
    text: "Your QR ticket arrives by email the moment payment is verified. One scan at the gate and you're in — no printouts, no apps.",
    badge: "Step 3",
    wash: "radial-gradient(120% 120% at 100% 100%, rgba(234,88,12,0.25) 0%, rgba(255,255,255,0) 55%)",
    pill: "bg-orange-100/80 text-orange-700",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path className="step-draw" d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" strokeLinecap="round" />
        <path className="step-draw" d="M4 12h16" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function HowItWorksPlatform() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        gsap.from(".how-head", {
          y: 24,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: ".how-head", start: "top 85%" },
        });

        // Progress line fills as the journey scrolls by. Scale only the axis
        // the line runs along — scaling both would thin it during the scrub.
        const lineScroll = {
          trigger: ".how-steps",
          start: "top 75%",
          end: "bottom 55%",
          scrub: 0.6,
        };
        const mm = gsap.matchMedia();
        mm.add("(min-width: 640px)", () => {
          gsap.fromTo(
            ".how-line-fill",
            { scaleX: 0, scaleY: 1 },
            { scaleX: 1, ease: "none", scrollTrigger: lineScroll }
          );
        });
        mm.add("(max-width: 639px)", () => {
          const track = ref.current!.querySelector<HTMLElement>(".how-line-track");
          const lastStep = ref.current!.querySelector<HTMLElement>(".how-step:last-child");
          if (track && lastStep) {
            track.style.bottom = `${Math.max(lastStep.offsetHeight - 26, 0)}px`;
          }
          gsap.fromTo(
            ".how-line-fill",
            { scaleY: 0, scaleX: 1 },
            { scaleY: 1, ease: "none", scrollTrigger: lineScroll }
          );
          return () => {
            if (track) track.style.bottom = "";
          };
        });

        gsap.utils.toArray<HTMLElement>(".how-step").forEach((card) => {
          const trigger = { trigger: card, start: "top 82%" };
          gsap.fromTo(
            card.querySelector(".step-card"),
            { y: 34, autoAlpha: 0, scale: 0.96 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: trigger,
              clearProps: "all",
            }
          );
          gsap.fromTo(
            card.querySelector(".step-num"),
            { scale: 0.3, autoAlpha: 0 },
            {
              scale: 1,
              autoAlpha: 1,
              duration: 0.6,
              delay: 0.1,
              ease: "back.out(2)",
              scrollTrigger: trigger,
              clearProps: "all",
            }
          );
          gsap.fromTo(
            card.querySelectorAll(".step-draw"),
            { drawSVG: "0%" },
            {
              drawSVG: "100%",
              duration: 0.9,
              delay: 0.25,
              stagger: 0.12,
              ease: "power2.inOut",
              scrollTrigger: trigger,
            }
          );
        });

        gsap.from(".how-cta", {
          y: 18,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: ".how-cta", start: "top 90%" },
        });
      }, ref);
      return () => ctx.revert();
    });
  }, []);

  return (
    <section ref={ref} id="how-it-works" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <div className="how-head mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          How it works
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
          Three steps to any gate
        </h2>
        <p className="mt-3 text-sm text-black sm:text-base">
          The whole journey lives in your inbox and one personal page — the
          same smooth flow for every event on the platform.
        </p>
      </div>

      <div className="how-steps relative mx-auto mt-10 max-w-5xl sm:mt-14">
        <div
          aria-hidden
          className="how-line-track absolute bottom-24 left-6 top-[26px] w-1 overflow-hidden rounded-full bg-orange-950/[0.07] sm:bottom-auto sm:left-[16.66%] sm:right-[16.66%] sm:top-6 sm:h-1 sm:w-auto"
        >
          <div className="how-line-fill h-full w-full origin-top rounded-full bg-gradient-to-b from-orange-500 to-red-500 sm:origin-left sm:bg-gradient-to-r" />
        </div>

        <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-5">
          {steps.map((step, i) => (
            <li key={step.title} className="how-step flex gap-4 sm:block">
              <div
                aria-hidden
                className="step-num relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-lg font-bold text-white shadow-lg shadow-orange-600/30 ring-4 ring-[#f7f4f0] sm:mx-auto"
              >
                {i + 1}
              </div>
              <div className="step-card relative mt-0 flex-1 overflow-hidden rounded-2xl bg-white/40 p-5 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:bg-white/55 hover:shadow-xl hover:shadow-orange-950/5 sm:mt-5 sm:text-center">
                <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: step.wash }} />
                <div className="relative">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${step.pill}`}>
                    {step.badge}
                  </span>
                  <div aria-hidden className="mt-3 text-orange-600 sm:mx-auto sm:flex sm:justify-center">
                    {step.icon}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-black">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-black">{step.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="how-cta mt-10 text-center text-sm font-bold text-black">
        Ready when you are —{" "}
        <Link
          href="/events"
          className="font-bold text-orange-700 underline decoration-orange-300 underline-offset-4 transition hover:text-orange-800"
        >
          find your next event
        </Link>
      </p>
    </section>
  );
}
