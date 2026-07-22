import { Avatar } from "@/components/admin/Avatar";
import { FadeIn } from "@/components/FadeIn";
import { formatBatch, shortBatch } from "@/lib/batch";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";
import type { Registration, Ticket } from "@/lib/types";

type TicketWithRegistration = Ticket & { registrations: Registration };

export default async function CheckinsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event } = await requireEventAccess(eventId);
  const supabase = createAdminClient();

  const [{ data: checkins }, { count: totalTickets }, { count: checkedInTotal }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("*, registrations!inner(*)")
        .eq("registrations.event_id", event.id)
        .not("checked_in_at", "is", null)
        .order("checked_in_at", { ascending: false })
        .limit(1000)
        .returns<TicketWithRegistration[]>(),
      supabase
        .from("tickets")
        .select("id, registrations!inner(event_id)", { count: "exact", head: true })
        .eq("registrations.event_id", event.id),
      // Counted separately: the list above is capped at 1000 rows, and one
      // ticket per seat makes that cap reachable at a real event.
      supabase
        .from("tickets")
        .select("id, registrations!inner(event_id)", { count: "exact", head: true })
        .eq("registrations.event_id", event.id)
        .not("checked_in_at", "is", null),
    ]);

  const checkedInCount = checkedInTotal ?? 0;
  const listed = checkins?.length ?? 0;

  return (
    <FadeIn>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Check-ins
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {event.name} — participants who have entered through the gate.
          </p>
        </div>
        <p className="rounded-full bg-orange-100/80 px-4 py-1.5 text-sm font-bold text-orange-700">
          {checkedInCount} / {totalTickets ?? 0} seats inside
        </p>
      </div>

      {listed < checkedInCount && (
        <p className="mb-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
          Showing the {listed} most recent check-ins of {checkedInCount}.
        </p>
      )}

      {!checkins || checkins.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-black/[0.04]">
          No one has checked in yet. Check-ins will appear here as tickets are
          scanned at the gate.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="space-y-3 md:hidden">
            {checkins.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={t.registrations.full_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">
                        {t.registrations.full_name}
                      </span>
                      {t.registrations.batch && (
                        <span className="block text-xs text-slate-400">
                          {formatBatch(t.registrations.batch, event.non_batch_label)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {t.seat_no && (
                      <span className="block font-mono text-base font-bold text-slate-900">
                        {t.seat_no}
                      </span>
                    )}
                    <span className="block font-mono text-xs font-semibold text-orange-700">
                      {t.ticket_number}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Checked in{" "}
                  {t.checked_in_at
                    ? new Date(t.checked_in_at).toLocaleString()
                    : "—"}
                </p>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] md:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5 font-semibold">Checked in</th>
                  <th className="px-5 py-3.5 font-semibold">Participant</th>
                  {event.collect_batch && (
                    <th className="px-5 py-3.5 font-semibold">Batch</th>
                  )}
                  <th className="px-5 py-3.5 font-semibold">Seat</th>
                  <th className="px-5 py-3.5 font-semibold">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50 transition last:border-0 hover:bg-orange-50/40"
                  >
                    <td className="px-5 py-3.5 text-slate-500">
                      {t.checked_in_at
                        ? new Date(t.checked_in_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3 font-semibold text-slate-900">
                        <Avatar name={t.registrations.full_name} />
                        {t.registrations.full_name}
                      </span>
                    </td>
                    {event.collect_batch && (
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {shortBatch(t.registrations.batch, event.non_batch_label)}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {t.seat_no ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-orange-700">
                      {t.ticket_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </FadeIn>
  );
}
