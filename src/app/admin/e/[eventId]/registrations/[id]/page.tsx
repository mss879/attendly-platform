import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/admin/Avatar";
import { FadeIn } from "@/components/FadeIn";
import { ReviewButtons } from "@/components/admin/ReviewButtons";
import { BookingEditor } from "@/components/admin/BookingEditor";
import { batchYears, portalUrl } from "@/lib/config";
import { formatBatch } from "@/lib/batch";
import { formatDateTime } from "@/lib/event-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEventAccess } from "@/lib/supabase/auth";
import { sortTickets } from "@/lib/tickets";
import type { PaymentSlip, Registration, Ticket } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; id: string }>;
}) {
  const { eventId, id } = await params;
  const { event } = await requireEventAccess(eventId);
  if (!UUID_RE.test(id)) notFound();

  const supabase = createAdminClient();
  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .eq("event_id", event.id)
    .maybeSingle<Registration>();
  if (!registration) notFound();

  const [{ data: slips }, { data: ticketRows }, { data: seatRows }] =
    await Promise.all([
      supabase
        .from("payment_slips")
        .select("*")
        .eq("registration_id", id)
        .order("uploaded_at", { ascending: false })
        .returns<PaymentSlip[]>(),
      supabase
        .from("tickets")
        .select("*")
        .eq("registration_id", id)
        .returns<Ticket[]>(),
      supabase
        .from("booked_seats")
        .select("seat_no")
        .eq("registration_id", id)
        .order("seat_no")
        .returns<{ seat_no: string }[]>(),
    ]);
  const seats = (seatRows ?? []).map((s) => s.seat_no);
  const tickets = sortTickets(ticketRows ?? []);
  const checkedInSeats = tickets
    .filter((t) => t.checked_in_at && t.seat_no)
    .map((t) => t.seat_no as string);

  // Seats held by every OTHER booking on this event — off-limits when
  // reassigning this one.
  const { data: eventSeatRows } = await supabase
    .from("booked_seats")
    .select("seat_no, registration_id")
    .eq("event_id", event.id)
    .returns<{ seat_no: string; registration_id: string }[]>();
  const otherTakenSeats = (eventSeatRows ?? [])
    .filter((s) => s.registration_id !== id)
    .map((s) => s.seat_no);

  // Signed URLs so organizers can view files in the private bucket.
  const slipViews = await Promise.all(
    (slips ?? []).map(async (slip) => {
      const { data } = await supabase.storage
        .from("payment-slips")
        .createSignedUrl(slip.storage_path, 60 * 60);
      return {
        ...slip,
        url: data?.signedUrl ?? null,
        isPdf: slip.storage_path.toLowerCase().endsWith(".pdf"),
      };
    })
  );

  return (
    <FadeIn stagger className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/admin/e/${event.id}/registrations`}
        className="inline-block text-sm font-semibold text-orange-600 transition hover:text-orange-800"
      >
        ← Back to registrations
      </Link>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={registration.full_name} />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {registration.full_name}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {formatBatch(registration.batch, event.non_batch_label)
                  ? `${formatBatch(registration.batch, event.non_batch_label)} · `
                  : ""}
                Ref{" "}
                <span className="font-mono font-semibold">
                  {registration.id.slice(0, 8).toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          <StatusBadge status={registration.payment_status} />
        </div>

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-xs text-slate-400">Email</dt>
            <dd className="font-semibold text-slate-900">{registration.email}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-xs text-slate-400">Phone</dt>
            <dd className="font-semibold text-slate-900">{registration.phone}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-xs text-slate-400">Registered</dt>
            <dd className="font-semibold text-slate-900">
              {formatDateTime(registration.created_at)}
            </dd>
          </div>
          {seats.length > 0 && (
            <div className="rounded-xl bg-orange-50 px-3.5 py-2.5">
              <dt className="text-xs text-orange-500">
                {seats.length === 1 ? "Seat" : `Seats (${seats.length})`}
              </dt>
              <dd className="font-mono font-semibold text-orange-900">
                {seats.join(", ")}
              </dd>
            </div>
          )}
          {tickets.length > 0 && (
            <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 sm:col-span-2">
              <dt className="text-xs text-emerald-500">
                {tickets.length === 1
                  ? "Ticket"
                  : `Tickets (${tickets.length}) — one QR per seat`}
              </dt>
              <dd className="mt-1 space-y-1">
                {tickets.map((t) => (
                  <p key={t.id} className="text-sm font-semibold text-emerald-800">
                    {t.seat_no && (
                      <span className="mr-2 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs">
                        {t.seat_no}
                      </span>
                    )}
                    {t.ticket_number}
                    <span className="font-normal text-emerald-600">
                      {t.checked_in_at
                        ? ` · checked in ${formatDateTime(t.checked_in_at)}`
                        : " · not checked in yet"}
                    </span>
                  </p>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
        <h2 className="text-base font-bold text-slate-900">Payment slips</h2>
        {slipViews.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No payment slip uploaded yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {slipViews.map((slip, i) => (
              <li key={slip.id} className="rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-xs text-slate-400">
                  {i === 0 ? "Latest — " : ""}
                  uploaded {formatDateTime(slip.uploaded_at)}
                </p>
                {!slip.url ? (
                  <p className="text-sm text-red-600">Could not load file.</p>
                ) : slip.isPdf ? (
                  <a
                    href={slip.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Open PDF slip ↗
                  </a>
                ) : (
                  <a href={slip.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slip.url}
                      alt="Payment slip"
                      className="max-h-96 rounded-lg ring-1 ring-black/[0.06]"
                    />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {registration.payment_status !== "verified" && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
          <h2 className="text-base font-bold text-slate-900">Review decision</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Verifying issues one ticket per seat and emails the QR codes to{" "}
            <strong>{registration.email}</strong>. Rejecting asks them to
            re-upload the slip and <strong>keeps their seats held</strong> — to
            free the seats, cancel the booking below.
          </p>
          <ReviewButtons registrationId={registration.id} />
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
        <h2 className="text-base font-bold text-slate-900">
          Attendee&apos;s ticket page
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Their personal link — share it if an email doesn&apos;t arrive.
        </p>
        <p className="mt-2 break-all rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-700">
          {portalUrl(registration.access_token)}
        </p>
      </section>

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">
          Manage this booking
        </h2>
        <BookingEditor
          registrationId={registration.id}
          eventId={event.id}
          status={registration.payment_status}
          seating={event.seating}
          collectBatch={event.collect_batch}
          years={batchYears()}
          initial={{
            fullName: registration.full_name,
            email: registration.email,
            phone: registration.phone,
            batch: registration.batch,
          }}
          currentSeats={seats}
          otherTakenSeats={otherTakenSeats}
          checkedInSeats={checkedInSeats}
          nonBatchLabel={event.non_batch_label ?? ""}
        />
      </div>
    </FadeIn>
  );
}
