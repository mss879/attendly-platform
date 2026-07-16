"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ScheduleItem } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

// Event description + schedule strip, driven entirely by event data.

export interface EventDetailsSectionProps {
  subtitle: string | null;
  description: string;
  schedule: ScheduleItem[];
  dateLabel: string;
  venue: string;
  priceLabel: string;
  bookHref: string;
  completed: boolean;
}

export function EventDetailsSection({
  subtitle,
  description,
  schedule,
  dateLabel,
  venue,
  priceLabel,
  bookHref,
  completed,
}: EventDetailsSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".event-head",
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: ".event-head", start: "top 85%" },
          clearProps: "all",
        }
      );
      gsap.fromTo(
        ".event-schedule > *",
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".event-schedule", start: "top 88%" },
          clearProps: "all",
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  // Date + venue always lead the strip; the event's own rows follow.
  const items: ScheduleItem[] = [
    { label: "Date", value: dateLabel },
    ...schedule,
    ...(venue ? [{ label: "Venue", value: venue }] : []),
  ];

  return (
    <section ref={ref} id="details" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <div className="event-head mx-auto max-w-2xl text-center">
        {subtitle && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
            {subtitle}
          </p>
        )}
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
          About this event
        </h2>
        <p className="mt-3 text-sm text-black sm:text-base">{description}</p>
      </div>

      <dl className="event-schedule mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl bg-white/30 p-4 shadow-lg shadow-orange-950/5 ring-1 ring-white/50 backdrop-blur-md sm:grid-cols-4 sm:p-5">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-xl bg-white/40 px-4 py-3 ring-1 ring-white/40 backdrop-blur-sm"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-orange-700/80">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold text-black">{item.value}</dd>
          </div>
        ))}
      </dl>

      {!completed && (
        <div className="mt-8 text-center">
          <Link
            href={bookHref}
            className="inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30"
          >
            Book your seats — {priceLabel} per seat
          </Link>
        </div>
      )}
    </section>
  );
}
