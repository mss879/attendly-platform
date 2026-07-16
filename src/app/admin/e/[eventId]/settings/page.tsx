import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { EventForm } from "@/components/admin/EventForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event } = await requireEventAccess(eventId);

  const supabase = createAdminClient();
  const { count: bookedCount } = await supabase
    .from("booked_seats")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  const seatingLocked = (bookedCount ?? 0) > 0;

  return (
    <FadeIn className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Event settings
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{event.name}</p>
        </div>
        {event.status === "published" && (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-black/[0.06] transition hover:bg-slate-50"
          >
            View public page ↗
          </Link>
        )}
      </div>

      {event.status === "rejected" && (
        <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          This event wasn&apos;t approved. Saving your changes submits it for
          review again.
        </p>
      )}

      <EventForm mode="edit" initial={event} seatingLocked={seatingLocked} />
    </FadeIn>
  );
}
