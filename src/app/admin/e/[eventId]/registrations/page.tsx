import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/admin/Avatar";
import { FadeIn } from "@/components/FadeIn";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";
import type { PaymentStatus, Registration } from "@/lib/types";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Awaiting payment" },
  { value: "slip_uploaded", label: "Slip under review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const inputClass =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";

export default async function RegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ status?: string; batch?: string; q?: string }>;
}) {
  const { eventId } = await params;
  const { event } = await requireEventAccess(eventId);
  const { status = "", batch = "", q = "" } = await searchParams;
  const supabase = createAdminClient();
  const base = `/admin/e/${event.id}`;

  let query = supabase
    .from("registrations")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (STATUSES.some((s) => s.value === status && s.value !== "")) {
    query = query.eq("payment_status", status);
  }
  if (batch.trim()) query = query.eq("batch", batch.trim());
  if (q.trim()) {
    const term = q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }

  const { data: registrations, error } = await query.returns<Registration[]>();

  return (
    <FadeIn>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Registrations
      </h1>
      <p className="mb-5 mt-0.5 text-sm text-slate-500">
        {event.name} — open a registration to review its payment slip.
      </p>

      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, email or phone…"
          className={`w-full sm:max-w-xs ${inputClass}`}
        />
        <select name="status" defaultValue={status} className={`flex-1 sm:flex-none ${inputClass}`}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {event.collect_batch && (
          <input
            type="text"
            name="batch"
            defaultValue={batch}
            placeholder="Batch"
            className={`w-24 ${inputClass}`}
          />
        )}
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          Could not load registrations. Check the Supabase configuration in
          .env.local and that the migrations have been applied.
        </p>
      ) : !registrations || registrations.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-black/[0.04]">
          No registrations found.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="space-y-3 md:hidden">
            {registrations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`${base}/registrations/${r.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
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
                    <StatusBadge status={r.payment_status as PaymentStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {r.batch && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                        # {r.batch}
                      </span>
                    )}
                    <span>{r.phone}</span>
                    <span className="ml-auto text-orange-600">Review →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5 font-semibold">Participant</th>
                  {event.collect_batch && (
                    <th className="px-5 py-3.5 font-semibold">Batch</th>
                  )}
                  <th className="px-5 py-3.5 font-semibold">Contact</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 transition last:border-0 hover:bg-orange-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3 font-semibold text-slate-900">
                        <Avatar name={r.full_name} />
                        {r.full_name}
                      </span>
                    </td>
                    {event.collect_batch && (
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          # {r.batch || "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{r.email}</div>
                      <div className="text-xs text-slate-400">{r.phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.payment_status as PaymentStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`${base}/registrations/${r.id}`}
                        className="font-semibold text-orange-600 transition hover:text-orange-800"
                      >
                        Review →
                      </Link>
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
