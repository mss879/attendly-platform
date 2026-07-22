"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SeatMap } from "@/components/book/SeatMap";
import { NON_BATCH_VALUE } from "@/lib/batch";
import { formatLKR } from "@/lib/seating";
import type { SeatingConfig } from "@/lib/types";

// Issues tickets for chosen seats without a booking or payment slip. Every
// seat becomes its own ticket with its own QR, exactly like a paid booking.

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelClass = "mb-1 block text-sm font-semibold text-slate-700";
const sectionClass =
  "space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6";

interface IssuedTicket {
  seatNo: string | null;
  ticketNumber: string;
}

export function CustomTicketForm({
  eventId,
  seating,
  collectBatch,
  years,
  initialTakenSeats,
  nonBatchLabel = "",
}: {
  eventId: string;
  seating: SeatingConfig;
  collectBatch: boolean;
  years: string[];
  initialTakenSeats: string[];
  /** Label for the non-cohort option, or "" when the event has none. */
  nonBatchLabel?: string;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [batch, setBatch] = useState("");
  const [notify, setNotify] = useState(true);
  const [seats, setSeats] = useState<string[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set(initialTakenSeats));

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{
    tickets: IssuedTicket[];
    emailSent: boolean;
    portalUrl: string;
    name: string;
    email: string;
  } | null>(null);

  function toggleSeat(seat: string) {
    setError(null);
    setSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat].sort()
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (seats.length === 0) {
      setError("Pick at least one seat on the plan below.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/custom-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          batch: collectBatch ? batch : "",
          seats,
          notify,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.takenSeats) && data.takenSeats.length) {
          setTaken((prev) => new Set([...prev, ...data.takenSeats]));
          setSeats((prev) => prev.filter((s) => !data.takenSeats.includes(s)));
        }
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setIssued({
        tickets: data.tickets ?? [],
        emailSent: Boolean(data.emailSent),
        portalUrl: data.portalUrl ?? "",
        name: fullName.trim(),
        email: email.trim(),
      });
      // The seats are gone now — keep the map honest for the next issue.
      setTaken((prev) => new Set([...prev, ...seats]));
      setSeats([]);
      setFullName("");
      setEmail("");
      setPhone("");
      setBatch("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- success ---------- */
  if (issued) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
              ✓
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">
                {issued.tickets.length}{" "}
                {issued.tickets.length === 1 ? "ticket" : "tickets"} issued to{" "}
                {issued.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {issued.emailSent ? (
                  <>
                    Emailed to <strong>{issued.email}</strong> with one QR code
                    attached per seat.
                  </>
                ) : (
                  <>
                    The email wasn&apos;t sent — share the personal ticket link
                    below with the guest instead.
                  </>
                )}
              </p>
            </div>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {issued.tickets.map((t) => (
              <li
                key={t.ticketNumber}
                className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3.5 py-2.5"
              >
                <span className="font-mono text-base font-bold text-emerald-900">
                  {t.seatNo ?? "—"}
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-700">
                  {t.ticketNumber}
                </span>
              </li>
            ))}
          </ul>

          {issued.portalUrl && (
            <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs text-slate-400">Guest ticket page</p>
              <p className="mt-0.5 break-all font-mono text-xs text-slate-700">
                {issued.portalUrl}
              </p>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => setIssued(null)}
          className="rounded-full bg-orange-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700"
        >
          Issue another ticket
        </button>
      </div>
    );
  }

  /* ---------- form ---------- */
  return (
    <form onSubmit={submit} className="space-y-5">
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Who is this for?</h2>
        <p className="-mt-2 text-sm text-slate-500">
          The guest gets their tickets by email straight away — no payment slip
          and no review step.
        </p>
        <div>
          <label htmlFor="ct-name" className={labelClass}>
            Full name
          </label>
          <input
            id="ct-name"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Mohamed Azam"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ct-email" className={labelClass}>
              Email
            </label>
            <input
              id="ct-email"
              type="email"
              required
              maxLength={200}
              placeholder="guest@example.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ct-phone" className={labelClass}>
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ct-phone"
              type="tel"
              maxLength={20}
              placeholder="+94 77 123 4567"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        {collectBatch && (
          <div>
            <label htmlFor="ct-batch" className={labelClass}>
              Batch (class of){" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              id="ct-batch"
              className={inputClass}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            >
              <option value="">Not specified</option>
              {nonBatchLabel && (
                <option value={NON_BATCH_VALUE}>{nonBatchLabel}</option>
              )}
              {years.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-1 h-4 w-4 accent-orange-600"
          />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">
              Email the tickets to the guest now
            </span>{" "}
            — one QR code attached per seat. Leave this off to issue quietly and
            share the ticket link yourself.
          </span>
        </label>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pick the seats</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Each seat becomes its own ticket with its own QR code. Booked
              seats are greyed out.
            </p>
          </div>
          {seats.length > 0 && (
            <p className="rounded-full bg-orange-100/80 px-4 py-1.5 text-sm font-bold text-orange-700">
              {seats.length} {seats.length === 1 ? "seat" : "seats"} ·{" "}
              {formatLKR(seats.length * seating.pricePerSeat)} face value
            </p>
          )}
        </div>

        <SeatMap
          seating={seating}
          taken={taken}
          selected={seats}
          onToggle={toggleSeat}
        />

        {seats.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {seats.map((s) => (
              <span
                key={s}
                className="rounded-full bg-orange-100/80 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700"
              >
                {s}
              </span>
            ))}
          </p>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:opacity-60"
        >
          {saving
            ? "Issuing…"
            : seats.length > 0
              ? `Issue ${seats.length} ${seats.length === 1 ? "ticket" : "tickets"} →`
              : "Issue tickets →"}
        </button>
      </div>
    </form>
  );
}
