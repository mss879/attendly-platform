import Link from "next/link";
import { Avatar } from "@/components/admin/Avatar";
import { FadeIn } from "@/components/FadeIn";
import { CustomTicketForm } from "@/components/admin/CustomTicketForm";
import { batchYears } from "@/lib/config";
import { formatDate } from "@/lib/event-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";
import type { Registration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomTicketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event } = await requireEventAccess(eventId);
  const supabase = createAdminClient();

  const [{ data: seatRows }, { data: issued, error: issuedError }] = await Promise.all([
    supabase
      .from("booked_seats")
      .select("seat_no")
      .eq("event_id", event.id)
      .returns<{ seat_no: string }[]>(),
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .eq("source", "custom")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Registration[]>(),
  ]);

  const takenSeats = (seatRows ?? []).map((s) => s.seat_no);

  return (
    <FadeIn className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Custom tickets
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Issue a ticket for a seat directly — for guests, sponsors, VIPs or
          payments you took offline. No slip, no review.
        </p>
      </div>

      <CustomTicketForm
        eventId={event.id}
        seating={event.seating}
        collectBatch={event.collect_batch}
        years={batchYears()}
        initialTakenSeats={takenSeats}
        nonBatchLabel={event.non_batch_label ?? ""}
      />

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">
          Issued by you{issued && issued.length > 0 ? ` (${issued.length})` : ""}
        </h2>
        {issuedError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            Could not load previously issued tickets. If this event&apos;s
            database is missing the latest migration, apply{" "}
            <span className="font-mono">0007_per_seat_tickets.sql</span> and
            reload.
          </p>
        ) : !issued || issued.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-black/[0.04]">
            No custom tickets yet. Issued tickets will be listed here and also
            appear under Registrations.
          </p>
        ) : (
          <ul className="space-y-2">
            {issued.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/e/${event.id}/registrations/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] transition hover:bg-orange-50/40"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.full_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">
                        {r.full_name}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {r.email}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDate(r.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </FadeIn>
  );
}
