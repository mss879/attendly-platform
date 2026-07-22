import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { BookingWizard } from "@/components/book/BookingWizard";
import { batchYears } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { eventPhase } from "@/lib/event-time";
import { formatLKR } from "@/lib/seating";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    title: `Book your seats — ${event.name}`,
    description: `Pick your numbered seats for ${event.name}${event.venue ? ` at ${event.venue}` : ""} — ${formatLKR(event.seating.pricePerSeat)} per seat.`,
    alternates: { canonical: `/events/${event.slug}/book` },
  };
}

async function getTakenSeats(eventId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("booked_seats")
      .select("seat_no")
      .eq("event_id", eventId)
      .returns<{ seat_no: string }[]>();
    if (error) {
      console.error("[book] could not load booked seats:", error);
      return [];
    }
    return (data ?? []).map((row) => row.seat_no);
  } catch (err) {
    // Missing Supabase env (e.g. local dev) — show an all-available plan.
    console.error("[book] booked seats unavailable:", err);
    return [];
  }
}

export default async function BookPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const completed = eventPhase(event.starts_at) === "completed";
  const takenSeats = completed ? [] : await getTakenSeats(event.id);

  return (
    <main className="flex flex-1 flex-col p-2">
      <AuroraBackground />

      {/* Floating app panel, same shell as the admin dashboard */}
      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
          <Logo href="/" accent="orange" withMark />
          <Link
            href={`/events/${event.slug}`}
            className="hidden truncate rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200/70 transition hover:bg-white sm:inline-flex"
          >
            ← {event.name}
          </Link>
        </header>

        <div className="flex-1 px-3 pb-8 pt-4 sm:px-6 sm:pb-12">
          {completed ? (
            <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.04]">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                This event has ended
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Bookings for {event.name} are closed. Check out what&apos;s
                coming up next on Attendly.
              </p>
              <Link
                href="/events"
                className="mt-5 inline-block rounded-full bg-orange-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700"
              >
                See upcoming events →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                  {[event.edition, event.subtitle].filter(Boolean).join(" · ") || event.name}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Book your seats
                </h1>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 sm:text-base">
                  Three quick steps: your details, your seats, your payment.
                </p>
              </div>

              <BookingWizard
                eventSlug={event.slug}
                seating={event.seating}
                collectBatch={event.collect_batch}
                years={batchYears()}
                initialTakenSeats={takenSeats}
                bank={event.bank}
                nonBatchLabel={event.non_batch_label ?? ""}
              />
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
