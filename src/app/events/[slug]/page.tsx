import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { EventDetailsSection } from "@/components/events/EventDetailsSection";
import { EventHero } from "@/components/events/EventHero";
import { HowItWorksEvent } from "@/components/events/HowItWorksEvent";
import { VersusSection } from "@/components/events/VersusSection";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import Link from "next/link";
import { getEventBySlug } from "@/lib/events";
import { eventPhase, formatEventDate, formatEventTime } from "@/lib/event-time";
import { formatLKR } from "@/lib/seating";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.attendly.buzz";

async function getPublishedEvent(slug: string): Promise<EventRow | null> {
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "published") return null;
  return event;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getPublishedEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.name,
    description: `${event.name}${event.venue ? ` at ${event.venue}` : ""} — book numbered seats from ${formatLKR(event.seating.pricePerSeat)}, pay by bank transfer and check in with a personal QR ticket.`,
    alternates: { canonical: `/events/${event.slug}` },
  };
}

export default async function EventPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const completed = eventPhase(event.starts_at) === "completed";
  const bookHref = `/events/${event.slug}/book`;
  const priceLabel = formatLKR(event.seating.pricePerSeat);
  const dateLabel = formatEventDate(event.starts_at);
  const timeLabel = event.starts_at ? formatEventTime(event.starts_at) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.edition ? `${event.name} — ${event.edition}` : event.name,
    description: event.description,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.starts_at ? { startDate: event.starts_at } : {}),
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", addressCountry: "LK" },
    },
    offers: {
      "@type": "Offer",
      price: event.seating.pricePerSeat,
      priceCurrency: "LKR",
      availability: completed
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      url: `${SITE_URL}${bookHref}`,
    },
    organizer: { "@type": "Organization", name: "ARC AI" },
  };

  return (
    <main className="flex flex-1 flex-col p-2 sm:p-4 lg:p-6">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <PublicHeader active="events" />

        <EventHero
          name={event.name}
          edition={event.edition}
          subtitle={event.subtitle}
          startsAt={event.starts_at}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          venue={event.venue}
          priceLabel={priceLabel}
          bookHref={bookHref}
          completed={completed}
        />

        {event.teams && (
          <VersusSection
            edition={event.edition}
            heading={`Experience ${event.teams.home.name} vs ${event.teams.away.name}`}
            home={event.teams.home}
            away={event.teams.away}
            tagline={event.tagline}
          />
        )}

        <EventDetailsSection
          subtitle={event.subtitle}
          description={event.description}
          schedule={event.schedule}
          dateLabel={dateLabel}
          venue={event.venue}
          priceLabel={priceLabel}
          bookHref={bookHref}
          completed={completed}
        />

        <HowItWorksEvent priceLabel={priceLabel} bookHref={bookHref} completed={completed} />

        {/* Final call to action */}
        <section className="px-4 pb-16 sm:px-7 sm:pb-24">
          <ScrollReveal className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-3xl bg-white/40 p-8 text-center shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md sm:p-12">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.30) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 120% at 0% 0%, rgba(220,38,38,0.12) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
              <div className="relative">
                {event.edition && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                    {event.edition}
                  </p>
                )}
                {completed ? (
                  <>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                      This event has ended
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm text-black sm:text-base">
                      Thanks to everyone who came! Browse what&apos;s coming up
                      next on the platform.
                    </p>
                    <Link
                      href="/events"
                      className="mt-6 inline-block rounded-full bg-black/85 px-9 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black"
                    >
                      See upcoming events →
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                      Grab your seats
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm text-black sm:text-base">
                      {priceLabel} per seat · numbered seating · your QR ticket
                      lands in your inbox after the organizers verify your
                      payment.
                    </p>
                    <Link
                      href={bookHref}
                      className="mt-6 inline-block rounded-full bg-orange-600 px-9 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30"
                    >
                      Book now →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </ScrollReveal>
        </section>
      </div>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape "<" so injected content can never close the script tag.
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
