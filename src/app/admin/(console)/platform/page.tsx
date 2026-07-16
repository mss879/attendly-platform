import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { PlatformReviewButtons } from "@/components/admin/PlatformReviewButtons";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/supabase/auth";
import { eventPhase, formatEventDate } from "@/lib/event-time";
import { formatLKR } from "@/lib/seating";
import type { EventRow, Profile } from "@/lib/types";

export default async function PlatformPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();

  const [{ data: events }, { data: profiles }, { data: authUsers }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<EventRow[]>(),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<Profile[]>(),
      supabase.auth.admin.listUsers({ perPage: 200 }),
    ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const all = events ?? [];
  const pending = all.filter((e) => e.status === "pending");

  function ownerLabel(event: EventRow): string {
    if (!event.owner_id) return "Platform";
    const profile = profileById.get(event.owner_id);
    const email = emailById.get(event.owner_id);
    return profile?.full_name
      ? `${profile.full_name}${email ? ` (${email})` : ""}`
      : (email ?? "Unknown");
  }

  function statusBadge(event: EventRow) {
    if (event.status === "pending")
      return { label: "Pending", cls: "bg-amber-100/80 text-amber-800" };
    if (event.status === "rejected")
      return { label: "Rejected", cls: "bg-red-100/80 text-red-700" };
    if (eventPhase(event.starts_at) === "completed")
      return { label: "Completed", cls: "bg-slate-100/80 text-slate-500" };
    return { label: "Published", cls: "bg-emerald-100/80 text-emerald-700" };
  }

  return (
    <FadeIn stagger>
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Platform
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Review event applications and keep an eye on everything running on
          Attendly.
        </p>
      </div>

      {/* Pending applications */}
      <section>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Pending applications
          </h2>
          <span className="inline-flex rounded-full bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-black/[0.04]">
            Nothing waiting for review. 🎉
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900">
                      {event.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      by {ownerLabel(event)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/e/${event.id}`}
                    className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    Open console →
                  </Link>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-400">Date</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatEventDate(event.starts_at)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-400">Venue</dt>
                    <dd className="truncate font-semibold text-slate-900">
                      {event.venue || "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-400">Seats</dt>
                    <dd className="font-semibold text-slate-900">
                      {event.seating.rows.length} × {event.seating.seatsPerRow} ·{" "}
                      {formatLKR(event.seating.pricePerSeat)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-400">Bank account</dt>
                    <dd className="font-semibold text-slate-900">
                      {event.bank.accountNumber
                        ? `${event.bank.name} · ${event.bank.accountNumber}`
                        : "Not provided"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                  {event.description}
                </p>

                <div className="mt-4">
                  <PlatformReviewButtons eventId={event.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* All events */}
      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">All events</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-semibold">Event</th>
                <th className="px-5 py-3.5 font-semibold">Organizer</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((event) => {
                const badge = statusBadge(event);
                return (
                  <tr
                    key={event.id}
                    className="border-b border-slate-50 transition last:border-0 hover:bg-orange-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900">{event.name}</span>
                      <span className="block text-xs text-slate-400">/events/{event.slug}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{ownerLabel(event)}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatEventDate(event.starts_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/e/${event.id}`}
                        className="font-semibold text-orange-600 transition hover:text-orange-800"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Organizers */}
      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Organizers</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-semibold">Name</th>
                <th className="px-5 py-3.5 font-semibold">Email</th>
                <th className="px-5 py-3.5 font-semibold">Role</th>
                <th className="px-5 py-3.5 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr
                  key={profile.id}
                  className="border-b border-slate-50 transition last:border-0 hover:bg-orange-50/40"
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {profile.full_name || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {emailById.get(profile.id) || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        profile.role === "super_admin"
                          ? "bg-violet-100/80 text-violet-700"
                          : "bg-slate-100/80 text-slate-600"
                      }`}
                    >
                      {profile.role === "super_admin" ? "Super admin" : "Organizer"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FadeIn>
  );
}
