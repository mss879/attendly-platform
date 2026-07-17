import type { Metadata } from "next";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { EventCard } from "@/components/events/EventCard";
import { FadeIn } from "@/components/FadeIn";
import { getEventListings } from "@/lib/events";

// ISR: serve the listing from cache, refresh in the background.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse upcoming and past events on Attendly — book numbered seats, pay by bank transfer and check in with a personal QR ticket.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const { upcoming, completed } = await getEventListings();

  return (
    <main className="flex flex-1 flex-col p-2">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <PublicHeader active="events" />

        <FadeIn stagger className="flex-1 px-4 pb-16 pt-10 sm:px-7 sm:pt-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              The Attendly lineup
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Events
            </h1>
            <p className="mt-3 text-sm text-black sm:text-base">
              Every event hosted on the platform — live countdowns, numbered
              seats and QR check-in included.
            </p>
          </div>

          {/* Upcoming */}
          <section className="mx-auto mt-12 max-w-5xl">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-black sm:text-xl">
                Upcoming events
              </h2>
              <span className="inline-flex rounded-full bg-orange-100/80 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                {upcoming.length}
              </span>
            </div>
            {upcoming.length > 0 ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-white/40 p-8 text-center shadow-sm ring-1 ring-white/60">
                <p className="text-sm font-semibold text-black">
                  No upcoming events right now — check back soon!
                </p>
                <Link
                  href="/host"
                  className="mt-3 inline-block text-sm font-bold text-orange-700 underline decoration-orange-300 underline-offset-4 hover:text-orange-800"
                >
                  Want to host yours? →
                </Link>
              </div>
            )}
          </section>

          {/* Completed */}
          {completed.length > 0 && (
            <section className="mx-auto mt-14 max-w-5xl">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold tracking-tight text-black sm:text-xl">
                  Completed events
                </h2>
                <span className="inline-flex rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                  {completed.length}
                </span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((event) => (
                  <EventCard key={event.id} event={event} completed />
                ))}
              </div>
            </section>
          )}

          {/* Host CTA strip */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="relative overflow-hidden rounded-3xl bg-white/40 p-8 text-center shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.30) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
              <div className="relative">
                <h2 className="text-xl font-bold tracking-tight text-black sm:text-2xl">
                  Your event belongs here
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-black">
                  Apply to host on Attendly — seat maps, verified payments and
                  QR check-in, all set up for you.
                </p>
                <Link
                  href="/host"
                  className="mt-5 inline-block rounded-full bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700"
                >
                  Host your event →
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}
