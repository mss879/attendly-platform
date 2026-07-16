import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import type { EventRow } from "@/lib/types";

// Upcoming-events strip on the landing page (server component — the page
// passes the events it loaded).

export function EventsPreview({ events }: { events: EventRow[] }) {
  if (events.length === 0) return null;

  return (
    <section id="upcoming" className="scroll-mt-8 px-4 py-16 sm:px-7 sm:py-24">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          On the platform now
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
          Upcoming events
        </h2>
        <p className="mt-3 text-sm text-black sm:text-base">
          Seats are live — pick an event, watch the countdown, book your spot.
        </p>
      </ScrollReveal>

      <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <ScrollReveal key={event.id}>
            <EventCard event={event} />
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal className="mt-8 text-center">
        <Link
          href="/events"
          className="inline-block rounded-full bg-white/80 px-7 py-3 text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-white"
        >
          See all events →
        </Link>
      </ScrollReveal>
    </section>
  );
}
