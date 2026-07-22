"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SeatMap } from "@/components/book/SeatMap";
import { NON_BATCH_VALUE } from "@/lib/batch";
import { formatLKR } from "@/lib/seating";
import type { BankDetails, SeatingConfig } from "@/lib/types";
import { SLIP_ALLOWED_TYPES, SLIP_MAX_BYTES } from "@/lib/validation";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9()\s-]{7,20}$/;

interface Details {
  fullName: string;
  email: string;
  phone: string;
  batch: string;
}

const STEPS = ["Your details", "Pick seats", "Pay & confirm"] as const;

export function BookingWizard({
  eventSlug,
  seating,
  collectBatch,
  years,
  initialTakenSeats,
  bank,
  nonBatchLabel = "",
}: {
  eventSlug: string;
  seating: SeatingConfig;
  collectBatch: boolean;
  years: string[];
  initialTakenSeats: string[];
  bank: BankDetails;
  /** Label for the non-cohort option, or "" when the event has none. */
  nonBatchLabel?: string;
}) {
  const [step, setStep] = useState(0); // 0..2, 3 = success
  const [details, setDetails] = useState<Details>({
    fullName: "",
    email: "",
    phone: "",
    batch: "",
  });
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set(initialTakenSeats));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ portalUrl: string; emailSent: boolean } | null>(null);

  const stepRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Animate each step in, and move focus to its heading for screen readers.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (!stepRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        stepRef.current,
        { x: 32, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", clearProps: "all" }
      );
    }, stepRef);
    return () => ctx.revert();
  }, [step, done]);

  const total = seats.length * seating.pricePerSeat;

  function nextFromDetails() {
    const { fullName, email, phone, batch } = details;
    if (fullName.trim().length < 2) return setDetailsError("Please enter your full name.");
    if (!EMAIL_RE.test(email.trim())) return setDetailsError("Please enter a valid email address.");
    if (!PHONE_RE.test(phone.trim())) return setDetailsError("Please enter a valid phone number.");
    if (collectBatch && !batch) return setDetailsError("Please select your batch year.");
    setDetailsError(null);
    setStep(1);
  }

  function toggleSeat(seat: string) {
    setSubmitError(null);
    setSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (prev.length >= seating.maxSeatsPerBooking) return prev;
      return [...prev, seat].sort();
    });
  }

  function chooseFile(f: File | null) {
    setFileError(null);
    if (!f) return setFile(null);

    const ext = f.name.split(".").pop()?.toLowerCase();
    const isMimeAllowed = f.type in SLIP_ALLOWED_TYPES;
    const isExtAllowed = ext && ["jpg", "jpeg", "png", "webp", "pdf"].includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      setFile(null);
      return setFileError("Only JPG, PNG, WebP or PDF files are accepted.");
    }
    if (f.size > SLIP_MAX_BYTES) {
      setFile(null);
      return setFileError("The file is larger than 5 MB. Please upload a smaller file.");
    }
    setFile(f);
  }

  async function submit() {
    if (!file || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const form = new FormData();
    form.set("event", eventSlug);
    form.set("fullName", details.fullName.trim());
    form.set("email", details.email.trim());
    form.set("phone", details.phone.trim());
    if (collectBatch) form.set("batch", details.batch);
    form.set("seats", JSON.stringify(seats));
    form.set("file", file);

    try {
      const res = await fetch("/api/book", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data.takenSeats) && data.takenSeats.length) {
          // Someone grabbed one of the seats first — refresh and re-pick.
          setTaken((prev) => new Set([...prev, ...data.takenSeats]));
          setSeats((prev) => prev.filter((s) => !data.takenSeats.includes(s)));
          setStep(1);
          setSubmitError(
            `Sorry — ${data.takenSeats.join(", ")} ${
              data.takenSeats.length === 1 ? "was" : "were"
            } just booked by someone else. Please pick ${
              data.takenSeats.length === 1 ? "another seat" : "other seats"
            }.`
          );
        } else {
          setSubmitError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }
      setDone({ portalUrl: data.portalUrl, emailSent: data.emailSent });
    } catch {
      setSubmitError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- success ---------- */
  if (done) {
    return (
      <div ref={stepRef} className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.04]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 100% 100%, rgba(52,211,153,0.28) 0%, rgba(255,255,255,0) 55%)",
          }}
        />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/80 text-2xl text-emerald-700">
            ✓
          </div>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none">
            Booking received!
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Your seats{" "}
            <span className="font-bold text-slate-700">{seats.join(", ")}</span>{" "}
            are reserved and your payment slip is with the organizers for
            review.{" "}
            {done.emailSent
              ? "We've emailed you a confirmation with your personal tracking link."
              : "Use your personal page below to track the review."}{" "}
            Your QR ticket arrives by email once the payment is verified.
          </p>
          <Link
            href={done.portalUrl}
            className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
          >
            Track my booking
          </Link>
          <p className="mt-3 text-xs text-slate-400">
            Keep the email — it contains this same personal link.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- wizard ---------- */
  return (
    <div className={`mx-auto w-full transition-all duration-350 ${step === 1 ? "max-w-7xl" : "max-w-4xl"}`}>
      {/* Progress */}
      <ol className="mx-auto mb-8 flex max-w-lg items-center" aria-label="Booking steps">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
            {i > 0 && (
              <span
                aria-hidden
                className={`mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-3 ${
                  i <= step ? "bg-orange-500" : "bg-orange-950/10"
                }`}
              />
            )}
            <span className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 transition ${
                  i < step
                    ? "bg-gradient-to-br from-orange-500 to-red-500 text-white ring-transparent"
                    : i === step
                      ? "bg-white text-orange-600 ring-orange-500"
                      : "bg-white/70 text-slate-400 ring-orange-950/10"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span
                className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
                  i === step ? "text-orange-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {submitError && (
        <p className="mx-auto mb-5 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {submitError}
        </p>
      )}

      {/* Step 1 — details */}
      {step === 0 && (
        <div ref={stepRef} className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04] sm:p-8">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none">
            Who&apos;s coming?
          </h2>
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="fullName"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Mohamed Azam"
              className={inputClass}
              value={details.fullName}
              onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                className={inputClass}
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-slate-700">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="+94 77 123 4567"
                className={inputClass}
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
              />
            </div>
          </div>
          {collectBatch && (
            <div>
              <label htmlFor="batch" className="mb-1 block text-sm font-semibold text-slate-700">
                Batch (class of)
              </label>
              <select
                id="batch"
                required
                className={inputClass}
                value={details.batch}
                onChange={(e) => setDetails({ ...details, batch: e.target.value })}
              >
                <option value="" disabled>
                  Select your batch year
                </option>
                {/* Guests who were never part of the cohort pick this instead
                    of a year — listed first so they don't scroll the years. */}
                {nonBatchLabel && (
                  <option value={NON_BATCH_VALUE}>{nonBatchLabel}</option>
                )}
                {years.map((y) => (
                  <option key={y} value={y}>
                    Class of {y}
                  </option>
                ))}
              </select>
              {nonBatchLabel && (
                <p className="mt-1 text-xs text-slate-400">
                  Not an old boy? Pick{" "}
                  <span className="font-semibold text-slate-500">
                    {nonBatchLabel}
                  </span>{" "}
                  — it&apos;s for family and friends.
                </p>
              )}
            </div>
          )}

          {detailsError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {detailsError}
            </p>
          )}

          <button
            type="button"
            onClick={nextFromDetails}
            className="w-full rounded-full bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/25"
          >
            Next — pick your seats →
          </button>
        </div>
      )}

      {/* Step 2 — seats */}
      {step === 1 && (
        <div ref={stepRef}>
          <div className="mb-4 text-center">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none">
              Pick your seats
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatLKR(seating.pricePerSeat)} per seat · up to{" "}
              {seating.maxSeatsPerBooking} seats per booking
            </p>
          </div>

          <SeatMap seating={seating} taken={taken} selected={seats} onToggle={toggleSeat} />

          <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] sm:flex-row sm:px-6">
            <div className="text-center sm:text-left">
              {seats.length === 0 ? (
                <p className="text-sm font-medium text-slate-400">
                  No seats selected yet — tap a seat on the plan.
                </p>
              ) : (
                <>
                  <p className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    {seats.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-orange-100/80 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700"
                      >
                        {s}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">
                    {seats.length} {seats.length === 1 ? "seat" : "seats"} ·{" "}
                    {formatLKR(total)}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/[0.06] transition hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={seats.length === 0}
                onClick={() => setStep(2)}
                className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Next — payment →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — pay & confirm */}
      {step === 2 && (
        <div ref={stepRef} className="mx-auto max-w-xl space-y-5">
          <h2 ref={headingRef} tabIndex={-1} className="text-center text-lg font-bold text-slate-900 outline-none">
            Pay &amp; confirm your booking
          </h2>

          {/* Order summary */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Your seats
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {seats.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-orange-100/80 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700"
                    >
                      {s}
                    </span>
                  ))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {formatLKR(total)}
                </p>
                <p className="text-xs text-slate-400">
                  {seats.length} × {formatLKR(seating.pricePerSeat)}
                </p>
              </div>
            </div>
          </section>

          {/* Bank details */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
            <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">
                1
              </span>
              Make the bank transfer
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Transfer <strong className="text-slate-700">{formatLKR(total)}</strong>{" "}
              to the account below, then upload the slip.
            </p>
            {bank.name || bank.accountName || bank.accountNumber || bank.branch ? (
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {bank.name && <Detail label="Bank" value={bank.name} />}
                {bank.accountName && <Detail label="Account name" value={bank.accountName} />}
                {bank.accountNumber && <Detail label="Account number" value={bank.accountNumber} />}
                {bank.branch && <Detail label="Branch" value={bank.branch} />}
              </dl>
            ) : (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                The organizers haven&apos;t shared their payment account yet —
                you&apos;ll find it on your personal tracking page (linked in
                your confirmation email) as soon as it&apos;s available.
              </p>
            )}

            <h3 className="mt-6 flex items-center gap-2.5 text-base font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">
                2
              </span>
              Upload your payment slip
            </h3>
            <p className="mb-3 mt-1 text-sm text-slate-500">
              JPG, PNG, WebP or PDF — max 5 MB. You can&apos;t place the booking
              without it.
            </p>
            <div className="relative">
              <label
                htmlFor="slip"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition focus-within:ring-2 focus-within:ring-orange-300 ${
                  file
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-orange-200 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <span className="text-2xl">{file ? "✅" : "🧾"}</span>
                <span className="mt-2 text-sm font-semibold text-slate-700 text-ellipsis overflow-hidden max-w-full px-4">
                  {file ? file.name : "Tap to choose your payment slip"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  {file ? "Tap to choose a different file" : "JPG · PNG · WebP · PDF, up to 5 MB"}
                </span>
                {/* sr-only (not display:none) keeps the input keyboard-focusable */}
                <input
                  id="slip"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    chooseFile(null);
                    const el = document.getElementById("slip") as HTMLInputElement;
                    if (el) el.value = "";
                  }}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 hover:bg-red-100 hover:text-red-700 transition"
                  title="Remove uploaded slip"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {fileError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                {fileError}
              </p>
            )}
          </section>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/[0.06] transition hover:bg-slate-50"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!file || submitting}
              onClick={submit}
              className="flex-1 rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-none sm:px-10"
            >
              {submitting ? "Booking…" : `Book now — ${formatLKR(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
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
