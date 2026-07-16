import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { getEventsForUser } from "@/lib/events";
import { eventPhase, formatEventDate } from "@/lib/event-time";
import { requireAuthContext } from "@/lib/supabase/auth";
import type { EventRow } from "@/lib/types";

function statusBadge(event: EventRow) {
  if (event.status === "pending")
    return { label: "Pending review", cls: "bg-amber-100/80 text-amber-800" };
  if (event.status === "rejected")
    return { label: "Not approved", cls: "bg-red-100/80 text-red-700" };
  if (eventPhase(event.starts_at) === "completed")
    return { label: "Completed", cls: "bg-slate-100/80 text-slate-500" };
  return { label: "Live", cls: "bg-emerald-100/80 text-emerald-700" };
}

export default async function MyEventsPage() {
  const { user, isSuperAdmin } = await requireAuthContext();
  const events = await getEventsForUser(user.id, isSuperAdmin);

  return (
    <FadeIn>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {isSuperAdmin ? "All events" : "My events"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isSuperAdmin
              ? "Every event on the platform. Open one to manage it."
              : "Open an event to manage registrations, payments and the gate."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <Link
              href="/admin/platform"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Platform review
            </Link>
          )}
          <Link
            href="/admin/events/new"
            className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-md"
          >
            + Create event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-base font-bold text-slate-900">No events yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create your first event — it goes live on the platform as soon as
            the Attendly team approves it.
          </p>
          <Link
            href="/admin/events/new"
            className="mt-5 inline-block rounded-full bg-orange-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700"
          >
            Create your event →
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const badge = statusBadge(event);
            return (
              <li key={event.id}>
                <Link
                  href={`/admin/e/${event.id}`}
                  className="group block h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {event.status === "published" && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        /events/{event.slug}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
                    {event.name}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {event.venue || "Venue TBA"}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {formatEventDate(event.starts_at)}
                  </p>
                  <p className="mt-4 text-sm font-bold text-orange-600 transition group-hover:text-orange-700">
                    Manage event →
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {events.some((e) => e.status === "pending") && (
        <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-100">
          <p className="font-semibold">Pending review</p>
          <p className="mt-1 leading-relaxed">
            Events marked &ldquo;Pending review&rdquo; are with the Attendly
            team. You&apos;ll get an email as soon as they&apos;re approved and
            live — you can keep editing them in the meantime.
          </p>
        </div>
      )}
    </FadeIn>
  );
}
