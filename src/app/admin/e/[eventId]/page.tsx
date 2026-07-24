import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { StatCards, type Stat } from "@/components/admin/StatCards";
import { Countdown } from "@/components/events/Countdown";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event } = await requireEventAccess(eventId);
  const supabase = createAdminClient();
  const base = `/admin/e/${event.id}`;

  const [total, seatsBooked, awaiting, verified, checkedIn] = await Promise.all([
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    // One booked_seats row per held seat, so this is the true seat count —
    // a single registration can hold up to maxSeatsPerBooking of them.
    supabase
      .from("booked_seats")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("payment_status", "slip_uploaded"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("payment_status", "verified"),
    supabase
      .from("tickets")
      .select("id, registrations!inner(event_id)", { count: "exact", head: true })
      .eq("registrations.event_id", event.id)
      .not("checked_in_at", "is", null),
  ]);

  // Total seats in this event's plan (rows × seats per row).
  const capacity = event.seating.rows.length * event.seating.seatsPerRow;

  const stats: Stat[] = [
    {
      label: "Total registrations",
      value: total.count ?? 0,
      href: `${base}/registrations`,
      badge: "All",
      tone: "violet",
    },
    {
      label: "Seats booked",
      value: seatsBooked.count ?? 0,
      sub: `of ${capacity.toLocaleString()} seats`,
      href: `${base}/registrations`,
      badge: "Seats",
      tone: "rose",
    },
    {
      label: "Awaiting review",
      value: awaiting.count ?? 0,
      href: `${base}/registrations?status=slip_uploaded`,
      badge: "Review",
      tone: "orange",
    },
    {
      label: "Payment verified",
      value: verified.count ?? 0,
      href: `${base}/registrations?status=verified`,
      badge: "Ticketed",
      tone: "emerald",
    },
    {
      label: "Checked in",
      value: checkedIn.count ?? 0,
      href: `${base}/checkins`,
      badge: "At venue",
      tone: "sky",
    },
  ];

  return (
    <FadeIn>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{event.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Countdown startsAt={event.starts_at} />
          <Link
            href={`${base}/scan`}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            Open gate scanner →
          </Link>
        </div>
      </div>

      {event.status === "pending" && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-100">
          <p className="font-semibold">This event is pending review</p>
          <p className="mt-1 leading-relaxed">
            The Attendly team is reviewing your event. It isn&apos;t visible on
            the public events page yet — you&apos;ll get an email once it&apos;s
            approved. You can keep refining it under{" "}
            <Link href={`${base}/settings`} className="font-bold underline underline-offset-2">
              Event settings
            </Link>
            .
          </p>
        </div>
      )}
      {event.status === "rejected" && (
        <div className="mb-6 rounded-2xl bg-red-50 p-5 text-sm text-red-700 ring-1 ring-red-100">
          <p className="font-semibold">This event wasn&apos;t approved</p>
          <p className="mt-1 leading-relaxed">
            Update the details under{" "}
            <Link href={`${base}/settings`} className="font-bold underline underline-offset-2">
              Event settings
            </Link>{" "}
            and it will be submitted for review again.
          </p>
        </div>
      )}

      <StatCards stats={stats} />

      <div className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-black/[0.04]">
        <p className="font-semibold text-slate-700">How it works</p>
        <p className="mt-1 leading-relaxed">
          Review payment slips under <strong>Registrations</strong> — verifying a
          slip issues the ticket and emails the QR code automatically. At the
          gate, use <strong>Scan tickets</strong> to check participants in.
        </p>
      </div>
    </FadeIn>
  );
}
