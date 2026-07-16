"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import { EventCard } from "@/components/events/EventCard";
import { runWhenPageVisible } from "@/lib/motion";
import type { EventRow } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

// "Happening now" act: a full-viewport gallery wall. An oversized two-row
// marquee headline (counter-drifting, scroll-scrubbed, velocity-skewed)
// crowns a grid of live event cards with pointer 3D tilt + specular shine,
// closed by a magnetic CTA. Everything server-renders in its final state —
// gsap.from / quickTo only add motion on top.

const MQ_PHRASES = ["Upcoming events", "Book your seat", "Live now"];

/** One run of the phrase loop; each track holds two so xPercent -50 loops seamlessly. */
function MarqueeCopy({ outline = false }: { outline?: boolean }) {
  return (
    <span className="flex shrink-0 items-center">
      {MQ_PHRASES.map((phrase) => (
        <Fragment key={phrase}>
          <span
            className="whitespace-nowrap px-5 sm:px-8"
            style={
              outline
                ? { WebkitTextStroke: "2px #ea580c", color: "transparent" }
                : undefined
            }
          >
            {phrase}
          </span>
          <span className="text-[0.45em] text-orange-500">✦</span>
        </Fragment>
      ))}
    </span>
  );
}

export function EventsPreview({ events }: { events: EventRow[] }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        // Endless counter-drift. Slightly different speeds so the rows
        // never sync up.
        gsap.to(".ev-mq-a", { xPercent: -50, ease: "none", duration: 36, repeat: -1 });
        gsap.fromTo(
          ".ev-mq-b",
          { xPercent: -50 },
          { xPercent: 0, ease: "none", duration: 30, repeat: -1 }
        );

        // Scroll scrub rides on `x` (px), a separate transform channel from
        // the looping xPercent — the two never fight.
        gsap.fromTo(
          ".ev-mq-a",
          { x: 80 },
          {
            x: -160,
            ease: "none",
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
        gsap.fromTo(
          ".ev-mq-b",
          { x: -160 },
          {
            x: 80,
            ease: "none",
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
          }
        );

        // ScrollTrigger resolves trigger selectors globally, not through the
        // context scope — pass the elements themselves.
        const grid = section.querySelector<HTMLElement>(".ev-grid");
        const marquee = section.querySelector<HTMLElement>(".ev-marquee");

        const mm = gsap.matchMedia();

        mm.add(
          "(min-width: 768px)",
          () => {
            const removers: (() => void)[] = [];

            // Gallery entrance: staggered 3D rise; clearProps leaves the
            // shells clean so the pointer tilt starts from identity.
            if (grid) {
              gsap.from(".ev-card", {
                y: 80,
                rotationX: -14,
                scale: 0.94,
                autoAlpha: 0,
                transformPerspective: 900,
                transformOrigin: "50% 100%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.12,
                clearProps: "all",
                scrollTrigger: { trigger: grid, start: "top 82%", once: true },
              });
            }

            // Scroll-velocity skew on the marquee, settling back to rest
            // shortly after the last scroll event.
            if (marquee) {
              const clampSkew = gsap.utils.clamp(-6, 6);
              const skewTo = gsap.quickTo(marquee, "skewX", { duration: 0.5, ease: "power3.out" });
              const settle = gsap.delayedCall(0.15, () => skewTo(0)).pause();
              const watch = ScrollTrigger.create({
                onUpdate(self) {
                  skewTo(clampSkew(self.getVelocity() / -350));
                  settle.restart(true);
                },
              });
              removers.push(() => {
                watch.kill();
                settle.kill();
              });
            }

            // Pointer tilt + moving specular shine per card. Mouse only — a
            // touch drag across the grid must not wobble the cards.
            gsap.utils.toArray<HTMLElement>(".ev-card", section).forEach((shell) => {
              const tilt = shell.querySelector<HTMLElement>(".ev-tilt");
              const shine = shell.querySelector<HTMLElement>(".ev-shine");
              if (!tilt || !shine) return;
              gsap.set(tilt, { transformPerspective: 900 });
              const rotX = gsap.quickTo(tilt, "rotationX", { duration: 0.45, ease: "power2.out" });
              const rotY = gsap.quickTo(tilt, "rotationY", { duration: 0.45, ease: "power2.out" });
              const shineX = gsap.quickTo(shine, "xPercent", { duration: 0.45, ease: "power2.out" });
              const shineFade = gsap.quickTo(shine, "opacity", { duration: 0.35, ease: "power2.out" });
              const onMove = (e: PointerEvent) => {
                if (e.pointerType !== "mouse") return;
                const r = shell.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                rotX(py * -14);
                rotY(px * 14);
                shineX(px * 70);
                shineFade(1);
              };
              const onLeave = () => {
                rotX(0);
                rotY(0);
                shineFade(0);
              };
              shell.addEventListener("pointermove", onMove);
              shell.addEventListener("pointerleave", onLeave);
              removers.push(() => {
                shell.removeEventListener("pointermove", onMove);
                shell.removeEventListener("pointerleave", onLeave);
              });
            });

            // Magnetic CTA — same lean-and-snap as the hero buttons.
            gsap.utils.toArray<HTMLElement>(".ev-cta a", section).forEach((el) => {
              const toX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
              const toY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
              const onMove = (e: PointerEvent) => {
                const r = el.getBoundingClientRect();
                toX(((e.clientX - r.left) / r.width - 0.5) * 12);
                toY(((e.clientY - r.top) / r.height - 0.5) * 8);
              };
              const onLeave = () => {
                toX(0);
                toY(0);
              };
              el.addEventListener("pointermove", onMove);
              el.addEventListener("pointerleave", onLeave);
              removers.push(() => {
                el.removeEventListener("pointermove", onMove);
                el.removeEventListener("pointerleave", onLeave);
              });
            });

            return () => removers.forEach((remove) => remove());
          },
          section
        );

        mm.add(
          "(max-width: 767px)",
          () => {
            // Phones skip the 3D theatre: a plain staggered rise.
            if (grid) {
              gsap.from(".ev-card", {
                y: 44,
                autoAlpha: 0,
                duration: 0.8,
                ease: "power3.out",
                stagger: 0.1,
                clearProps: "all",
                scrollTrigger: { trigger: grid, start: "top 85%", once: true },
              });
            }
          },
          section
        );
      }, section);
      return () => ctx.revert();
    });
  }, []);

  if (events.length === 0) return null;

  const gridCols =
    events.length === 1
      ? "max-w-md"
      : events.length === 2
        ? "max-w-3xl sm:grid-cols-2"
        : "max-w-6xl sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      id="upcoming"
      ref={ref}
      className="relative flex min-h-svh scroll-mt-24 flex-col justify-center overflow-x-clip pt-24 pb-16 sm:pt-28 sm:pb-20"
    >
      {/* Soft ember glow behind the gallery wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
              "radial-gradient(65% 55% at 50% 58%, rgba(251,146,60,0.12) 0%, rgba(247,244,240,0) 70%)",
        }}
      />

      <header className="px-4 text-center sm:px-7">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          On the platform now
        </p>
        <h2 className="sr-only">Upcoming events</h2>
      </header>

      {/* Oversized double marquee = the visual headline. Decorative for
          assistive tech; the sr-only h2 carries the semantics. */}
      <div
        aria-hidden
        className="ev-marquee pointer-events-none mt-5 w-full select-none overflow-hidden py-1 font-bold uppercase leading-none tracking-tight will-change-transform"
      >
        <div className="ev-mq-a flex w-max items-center text-[clamp(2rem,5vw,3.75rem)] will-change-transform">
          <MarqueeCopy outline />
          <MarqueeCopy outline />
        </div>
        <div className="ev-mq-b -mt-[0.12em] flex w-max items-center text-[clamp(2rem,5vw,3.75rem)] text-black will-change-transform">
          <MarqueeCopy />
          <MarqueeCopy />
        </div>
      </div>

      <p className="mt-6 px-4 text-center text-sm font-semibold text-black sm:px-7 sm:text-base">
        Seats are live — pick your event, book your spot.
      </p>

      <div className={`ev-grid mx-auto mt-10 grid w-full gap-6 px-4 sm:mt-12 sm:px-7 ${gridCols}`}>
        {events.map((event) => (
          <div key={event.id} className="ev-card">
            <div className="ev-tilt relative h-full will-change-transform">
              <EventCard event={event} />
              {/* Specular shine: a diagonal band that follows the pointer */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div
                  className="ev-shine absolute inset-y-[-20%] left-[-25%] w-[150%] opacity-0"
                  style={{
                    background:
                      "linear-gradient(100deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 58%)",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center sm:mt-12">
        <span className="ev-cta inline-block">
          <Link
            href="/events"
            className="group inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-colors hover:bg-orange-700"
          >
            See all events
            <span className="ml-1.5 inline-block transition group-hover:translate-x-0.5">→</span>
          </Link>
        </span>
      </div>
    </section>
  );
}
