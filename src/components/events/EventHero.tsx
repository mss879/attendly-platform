"use client";

import gsap from "gsap";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { runWhenPageVisible } from "@/lib/motion";
import { Countdown } from "./Countdown";
import { ShareModal } from "./ShareModal";

// Hero for the generic event page: masked-rise event name, live countdown,
// date/venue chips and the booking CTA.

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

export interface EventHeroProps {
  name: string;
  edition: string | null;
  subtitle: string | null;
  startsAt: string | null;
  dateLabel: string;
  timeLabel: string | null;
  venue: string;
  priceLabel: string;
  bookHref: string;
  completed: boolean;
  slug: string;
}

export function EventHero({
  name,
  edition,
  subtitle,
  startsAt,
  dateLabel,
  timeLabel,
  venue,
  priceLabel,
  bookHref,
  completed,
  slug,
}: EventHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-badge", { y: 16, autoAlpha: 0, duration: 0.5, clearProps: "all" })
          .from(
            ".hero-word",
            { yPercent: 120, duration: 0.8, stagger: 0.06, clearProps: "all" },
            "-=0.25"
          )
          .from(".hero-sub", { y: 18, autoAlpha: 0, duration: 0.6, clearProps: "all" }, "-=0.45")
          .from(
            ".hero-meta",
            { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.07, clearProps: "all" },
            "-=0.35"
          )
          .from(".hero-count", { y: 20, autoAlpha: 0, scale: 0.96, duration: 0.6, clearProps: "all" }, "-=0.3")
          .from(".hero-cta", { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.08, clearProps: "all" }, "-=0.3");
      }, ref);
      return () => ctx.revert();
    });
  }, []);

  return (
    <section ref={ref} className="relative px-4 pb-14 pt-12 text-center sm:pb-18 sm:pt-16">
      {edition && (
        <span className="hero-badge inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200/70">
          {!completed && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
          )}
          {edition}
        </span>
      )}

      <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
        {name.split(" ").map((word, i, arr) => (
          <Fragment key={`${word}-${i}`}>
            <Word accent={i >= arr.length - 2}>{word}</Word>{" "}
          </Fragment>
        ))}
      </h1>

      {subtitle && (
        <p className="hero-sub mx-auto mt-4 max-w-xl text-base text-black sm:text-lg">{subtitle}</p>
      )}

      {/* Date / time / venue chips */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="hero-meta inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-black ring-1 ring-white/60">
          <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="5.5" width="16" height="15" rx="2" />
            <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
          </svg>
          {dateLabel}
        </span>
        {timeLabel && (
          <span className="hero-meta inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-black ring-1 ring-white/60">
            <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" strokeLinecap="round" />
            </svg>
            {timeLabel}
          </span>
        )}
        {venue && (
          <span className="hero-meta inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-black ring-1 ring-white/60">
            <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.5a6.5 6.5 0 0 1 6.5 6.3C18.5 15.6 12 21 12 21Z" />
              <circle cx="12" cy="10.8" r="2.3" />
            </svg>
            {venue}
          </span>
        )}
      </div>

      {/* Live countdown */}
      <div className="hero-count mt-8">
        <Countdown startsAt={startsAt} variant="panel" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {!completed && (
          <span className="hero-cta inline-block">
            <Link
              href={bookHref}
              className="group inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30"
            >
              Book my seats
              <span className="ml-1.5 inline-block transition group-hover:translate-x-0.5">→</span>
            </Link>
          </span>
        )}
        <span className="hero-cta inline-block">
          <button
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-8 py-3.5 text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-white cursor-pointer animate-none"
          >
            <svg className="h-4 w-4 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Event
          </button>
        </span>
        <span className="hero-cta inline-block">
          <Link
            href="/events"
            className="inline-block rounded-full bg-white/80 px-8 py-3.5 text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-white"
          >
            All events
          </Link>
        </span>
      </div>

      {!completed && (
        <p className="hero-cta mt-6 text-xs font-bold text-black">
          {priceLabel} per seat · Numbered seating · Personal QR ticket by email
        </p>
      )}

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        eventName={name}
        eventSlug={slug}
      />
    </section>
  );
}
