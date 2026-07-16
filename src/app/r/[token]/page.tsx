import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";
import { SlipUploadForm } from "@/components/SlipUploadForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatLKR } from "@/lib/seating";
import { qrDataUrl } from "@/lib/qr";
import type { EventRow, PaymentSlip, Registration, Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";

// Personal, token-protected pages — keep them out of search engines.
export const metadata: Metadata = {
  title: "Your reservation",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const supabase = createAdminClient();
  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("access_token", token)
    .maybeSingle<Registration>();

  if (!registration) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", registration.event_id)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const [{ data: slips }, { data: seatRows }] = await Promise.all([
    supabase
      .from("payment_slips")
      .select("*")
      .eq("registration_id", registration.id)
      .order("uploaded_at", { ascending: false })
      .returns<PaymentSlip[]>(),
    supabase
      .from("booked_seats")
      .select("seat_no")
      .eq("registration_id", registration.id)
      .order("seat_no")
      .returns<{ seat_no: string }[]>(),
  ]);
  const seats = (seatRows ?? []).map((s) => s.seat_no);

  let ticket: Ticket | null = null;
  let qrImage: string | null = null;
  if (registration.payment_status === "verified") {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("registration_id", registration.id)
      .maybeSingle<Ticket>();
    ticket = data;
    if (ticket) qrImage = await qrDataUrl(ticket.qr_token);
  }

  const latestSlip = slips?.[0] ?? null;
  const status = registration.payment_status;
  const { bank } = event;
  const eventName = event.name;
  const pricePerSeat = event.seating.pricePerSeat;

  return (
    <main className="flex flex-1 flex-col p-2">
      <AuroraBackground />

      {/* Floating app panel, same shell as the admin dashboard */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <Logo href="/" accent="orange" withMark />
          <span className="hidden truncate rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200/70 sm:inline-flex">
            {eventName}
          </span>
        </header>

        <FadeIn stagger className="flex-1 space-y-5 px-3 pb-4 sm:space-y-6 sm:px-5 sm:pb-6">
          {/* Reservation summary */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {registration.full_name}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {registration.batch ? `Class of ${registration.batch} · ` : ""}
                  Ref{" "}
                  <span className="font-mono font-semibold">
                    {registration.id.slice(0, 8).toUpperCase()}
                  </span>
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
            {seats.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {seats.length === 1 ? "Seat" : "Seats"}
                </span>
                {seats.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-orange-100/80 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700"
                  >
                    {s}
                  </span>
                ))}
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {formatLKR(seats.length * pricePerSeat)}
                </span>
              </div>
            )}
          </section>

          {/* Verified: the ticket */}
          {status === "verified" && ticket && qrImage && (
            <section className="relative overflow-hidden rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/[0.04] sm:p-6">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 100% 0%, rgba(52,211,153,0.25) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
              <div className="relative">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Your ticket
                </h2>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {ticket.ticket_number}
                </p>
                {/* Data-URL QR: sized to the screen but capped so it stays crisp and
                    scannable, even on the smallest phones */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImage}
                  alt={`QR code for ticket ${ticket.ticket_number}`}
                  className="mx-auto mt-4 aspect-square w-full max-w-[16rem] rounded-xl shadow-sm ring-1 ring-black/[0.06]"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Show this QR code at the entrance to check in.
                </p>
                <a
                  href={qrImage}
                  download={`attendly-${ticket.ticket_number}.png`}
                  className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                >
                  Download QR code
                </a>
                {ticket.checked_in_at && (
                  <p className="mt-4 rounded-xl bg-emerald-100/80 px-3 py-2 text-sm font-semibold text-emerald-700">
                    ✓ Checked in at{" "}
                    {new Date(ticket.checked_in_at).toLocaleString()}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Not yet verified: payment instructions + upload */}
          {status !== "verified" && (
            <>
              {status === "rejected" && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                  <span className="font-bold">Your payment slip was rejected.</span>{" "}
                  Please upload a clear photo or PDF of your payment slip again.
                </div>
              )}
              {status === "slip_uploaded" && (
                <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700 ring-1 ring-sky-100">
                  <span className="font-bold">Your slip is being reviewed.</span>{" "}
                  You&apos;ll get your ticket by email once the payment is verified.
                  {latestSlip && (
                    <span className="mt-1 block text-xs text-sky-600">
                      Last upload:{" "}
                      {new Date(latestSlip.uploaded_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
                <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">
                    1
                  </span>
                  Make the payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Transfer the ticket fee to the account below.
                </p>
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {seats.length > 0 ? (
                    <Detail
                      label="Amount"
                      value={formatLKR(seats.length * pricePerSeat)}
                    />
                  ) : (
                    <Detail label="Amount" value={`${formatLKR(pricePerSeat)} per seat`} />
                  )}
                  {bank.name && <Detail label="Bank" value={bank.name} />}
                  {bank.accountName && (
                    <Detail label="Account name" value={bank.accountName} />
                  )}
                  {bank.accountNumber && (
                    <Detail label="Account number" value={bank.accountNumber} />
                  )}
                  {bank.branch && <Detail label="Branch" value={bank.branch} />}
                </dl>

                <h2 className="mt-6 flex items-center gap-2.5 text-base font-bold text-slate-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">
                    2
                  </span>
                  Upload your payment slip
                </h2>
                <p className="mb-3 mt-1 text-sm text-slate-500">
                  JPG, PNG, WebP or PDF — max 5 MB.
                  {status === "slip_uploaded" &&
                    " Uploading again will replace the slip under review."}
                </p>
                <SlipUploadForm token={token} />
              </section>
            </>
          )}
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-xl bg-[#f7f4f0] px-3 py-2 sm:block">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
