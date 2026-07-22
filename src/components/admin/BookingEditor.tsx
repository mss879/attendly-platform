"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SeatMap } from "@/components/book/SeatMap";
import { NON_BATCH_VALUE } from "@/lib/batch";
import { formatLKR } from "@/lib/seating";
import type { PaymentStatus, SeatingConfig } from "@/lib/types";

// Full organizer control over one booking: edit the attendee's details,
// reassign seats, resend the email, un-verify, or cancel outright.

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelClass = "mb-1 block text-sm font-semibold text-slate-700";
const sectionClass =
  "space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6";

export function BookingEditor({
  registrationId,
  eventId,
  status,
  seating,
  collectBatch,
  years,
  initial,
  currentSeats,
  otherTakenSeats,
  checkedInSeats,
  nonBatchLabel = "",
}: {
  registrationId: string;
  eventId: string;
  status: PaymentStatus;
  seating: SeatingConfig;
  collectBatch: boolean;
  years: string[];
  initial: { fullName: string; email: string; phone: string; batch: string };
  currentSeats: string[];
  /** Seats held by other bookings — not selectable here. */
  otherTakenSeats: string[];
  /** Seats already scanned at the gate — cannot be removed. */
  checkedInSeats: string[];
  /** Label for the non-cohort option, or "" when the event has none. */
  nonBatchLabel?: string;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [batch, setBatch] = useState(initial.batch);
  const [seats, setSeats] = useState<string[]>(currentSeats);
  const [notify, setNotify] = useState(true);
  const [editSeats, setEditSeats] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const verified = status === "verified";
  const taken = new Set(otherTakenSeats);
  const seatsDirty =
    seats.length !== currentSeats.length ||
    seats.some((s) => !currentSeats.includes(s));

  function toggleSeat(seat: string) {
    setError(null);
    // A scanned seat is part of the attendance record — keep it put.
    if (checkedInSeats.includes(seat) && seats.includes(seat)) {
      setError(`${seat} has already been checked in, so it can't be removed.`);
      return;
    }
    setSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat].sort()
    );
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("save");
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          batch: collectBatch ? batch : "",
          seats: editSeats ? seats : undefined,
          notify,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.takenSeats) && data.takenSeats.length) {
          setSeats(currentSeats);
        }
        setError(data.error ?? "Could not save. Please try again.");
        return;
      }
      setNotice(
        data.seatsChanged
          ? data.emailSent
            ? "Saved. New seats assigned and updated QR codes emailed."
            : "Saved. New seats assigned — the old QR codes no longer work."
          : "Saved."
      );
      setEditSeats(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function act(action: "resend" | "unverify") {
    setError(null);
    setNotice(null);
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed. Please try again.");
        return;
      }
      if (action === "resend") {
        setNotice(
          data.emailSent
            ? data.kind === "ticket"
              ? `Tickets re-sent to ${email}.`
              : `Booking confirmation re-sent to ${email}.`
            : "The email could not be sent — check the email settings."
        );
      } else {
        setNotice("Tickets revoked. The booking is back under review.");
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function cancelBooking() {
    setError(null);
    setBusy("cancel");
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not cancel the booking.");
        setConfirmCancel(false);
        return;
      }
      router.push(`/admin/e/${eventId}/registrations`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <form onSubmit={save} className="space-y-5">
        <section className={sectionClass}>
          <h2 className="text-base font-bold text-slate-900">Attendee details</h2>
          <div>
            <label htmlFor="be-name" className={labelClass}>
              Full name
            </label>
            <input
              id="be-name"
              required
              minLength={2}
              maxLength={120}
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="be-email" className={labelClass}>
                Email
              </label>
              <input
                id="be-email"
                type="email"
                required
                maxLength={200}
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Future tickets and emails go to this address.
              </p>
            </div>
            <div>
              <label htmlFor="be-phone" className={labelClass}>
                Phone <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="be-phone"
                type="tel"
                maxLength={20}
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          {collectBatch && (
            <div>
              <label htmlFor="be-batch" className={labelClass}>
                Batch (class of)
              </label>
              <select
                id="be-batch"
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
        </section>

        <section className={sectionClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Seats</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {currentSeats.length > 0
                  ? `Currently holding ${currentSeats.join(", ")}`
                  : "This booking holds no seats."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditSeats((v) => !v);
                setSeats(currentSeats);
                setError(null);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-black/[0.06] transition hover:bg-slate-50"
            >
              {editSeats ? "Cancel seat change" : "Change seats"}
            </button>
          </div>

          {editSeats && (
            <>
              {verified && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                  This booking is verified. Removing a seat permanently
                  invalidates its QR code, and any seat you add gets a brand-new
                  QR.
                </p>
              )}
              {checkedInSeats.length > 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Already checked in and locked:{" "}
                  <span className="font-mono font-semibold">
                    {checkedInSeats.join(", ")}
                  </span>
                </p>
              )}

              <SeatMap
                seating={seating}
                taken={taken}
                selected={seats}
                onToggle={toggleSeat}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">
                  {seats.length} {seats.length === 1 ? "seat" : "seats"} ·{" "}
                  {formatLKR(seats.length * seating.pricePerSeat)}
                </p>
                {seatsDirty && (
                  <span className="rounded-full bg-orange-100/80 px-3 py-1 text-xs font-bold text-orange-700">
                    Unsaved seat change
                  </span>
                )}
              </div>

              {verified && seatsDirty && (
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-orange-600"
                  />
                  <span className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Email the updated tickets
                    </span>{" "}
                    — their old QR codes stop working, so they need the new ones.
                  </span>
                </label>
              )}
            </>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-full bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:opacity-60"
          >
            {busy === "save" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Email</h2>
        <p className="-mt-2 text-sm text-slate-500">
          {verified
            ? "Re-sends the tickets with one QR code attached per seat."
            : "Re-sends the booking confirmation, including the payment account."}
        </p>
        <button
          type="button"
          onClick={() => act("resend")}
          disabled={busy !== null}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {busy === "resend" ? "Sending…" : "Re-send email"}
        </button>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-100 sm:p-6">
        <h2 className="text-base font-bold text-red-700">Danger zone</h2>

        {verified && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Un-verify</span> —
              revokes every issued QR and puts the booking back under review. The
              seats stay held.
            </p>
            <button
              type="button"
              onClick={() => act("unverify")}
              disabled={busy !== null}
              className="shrink-0 rounded-full bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {busy === "unverify" ? "Revoking…" : "Un-verify booking"}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Cancel booking</span>{" "}
            — deletes it for good and puts its seats back on sale.
          </p>
          {confirmCancel ? (
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/[0.06]"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={cancelBooking}
                disabled={busy !== null}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy === "cancel" ? "Cancelling…" : "Yes, cancel it"}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={busy !== null}
              className="shrink-0 rounded-full bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-60"
            >
              Cancel booking
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
