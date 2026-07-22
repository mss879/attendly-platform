"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_SEATING } from "@/lib/seating";
import type { EventRow, ScheduleItem } from "@/lib/types";

// Create/edit form for an event — used by the "Create event" wizard and the
// per-event Settings page. Sends JSON to the events API; the server decides
// status transitions (new + edited-after-rejection events go to review).

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelClass = "mb-1 block text-sm font-semibold text-slate-700";
const sectionClass = "space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** ISO timestamp -> value for <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO (empty stays empty = TBA). */
function toIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

export function EventForm({
  mode,
  initial,
  seatingLocked = false,
}: {
  mode: "create" | "edit";
  initial?: EventRow;
  /** True when the event already has bookings — the price can't change. */
  seatingLocked?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [edition, setEdition] = useState(initial?.edition ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial?.banner_url ?? "");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at ?? null));
  const [gatesOpenAt, setGatesOpenAt] = useState(toLocalInput(initial?.gates_open_at ?? null));
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initial?.schedule ?? []);

  const [hasTeams, setHasTeams] = useState(Boolean(initial?.teams));
  const [teams, setTeams] = useState(
    initial?.teams ?? {
      home: { name: "", city: "", crest: "" },
      away: { name: "", city: "", crest: "" },
    }
  );

  const seat0 = initial?.seating ?? DEFAULT_SEATING;
  const [rowCount, setRowCount] = useState(seat0.rows.length);
  const [seatsPerRow, setSeatsPerRow] = useState(seat0.seatsPerRow);
  const [blocksText, setBlocksText] = useState(seat0.blocks.join(", "));
  const [pricePerSeat, setPricePerSeat] = useState(seat0.pricePerSeat);
  const [maxSeats, setMaxSeats] = useState(seat0.maxSeatsPerBooking);

  const [bank, setBank] = useState(
    initial?.bank ?? { name: "", accountName: "", accountNumber: "", branch: "" }
  );
  const [collectBatch, setCollectBatch] = useState(initial?.collect_batch ?? false);
  const [nonBatchLabel, setNonBatchLabel] = useState(initial?.non_batch_label ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSchedule(i: number, key: "label" | "value", value: string) {
    setSchedule((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const generatedRows = Array.from({ length: Math.min(Math.max(rowCount, 1), 26) }, (_, i) =>
      String.fromCharCode(65 + i)
    );
    // Keep the stored row letters while the count is unchanged — regenerating
    // them as A.. would report a phantom seating change on events whose rows
    // aren't a contiguous A-prefix, tripping the booked-seats edit lock.
    const rows =
      initial && initial.seating.rows.length === generatedRows.length
        ? initial.seating.rows
        : generatedRows;
    const blocks = blocksText
      .split(",")
      .map((part) => parseInt(part.trim(), 10))
      .filter((num) => Number.isFinite(num) && num > 0);
    const blockSum = blocks.reduce((a, b) => a + b, 0);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      bannerUrl: bannerUrl.trim(),
      edition: edition.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      venue: venue.trim(),
      startsAt: toIso(startsAt),
      gatesOpenAt: toIso(gatesOpenAt),
      schedule: schedule.filter((row) => row.label.trim() && row.value.trim()),
      teams:
        hasTeams && teams.home.name.trim() && teams.away.name.trim()
          ? teams
          : null,
      seating: {
        rows,
        seatsPerRow,
        blocks: blockSum === seatsPerRow ? blocks : [seatsPerRow],
        pricePerSeat,
        maxSeatsPerBooking: maxSeats,
      },
      bank,
      collectBatch,
      nonBatchLabel: collectBatch ? nonBatchLabel.trim() : "",
    };

    setSaving(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/events" : `/api/admin/events/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (mode === "create") {
        router.push(`/admin/e/${data.id}`);
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Basics */}
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Event basics</h2>
        <div>
          <label htmlFor="ev-name" className={labelClass}>
            Event name
          </label>
          <input
            id="ev-name"
            required
            minLength={3}
            maxLength={120}
            placeholder="e.g. Summer Music Night 2026"
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-slug" className={labelClass}>
              Page address (slug)
            </label>
            <div className="flex items-center gap-1">
              <span className="shrink-0 text-xs font-semibold text-slate-400">/events/</span>
              <input
                id="ev-slug"
                required
                minLength={3}
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="summer-music-night"
                className={inputClass}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="ev-edition" className={labelClass}>
              Edition / badge line <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ev-edition"
              maxLength={80}
              placeholder="e.g. 3rd Edition"
              className={inputClass}
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="ev-subtitle" className={labelClass}>
            Subtitle <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="ev-subtitle"
            maxLength={160}
            placeholder="e.g. An open-air concert under the stars"
            className={inputClass}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ev-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="ev-description"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="What makes this event special? This appears on your event page."
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ev-venue" className={labelClass}>
            Venue
          </label>
          <input
            id="ev-venue"
            required
            minLength={3}
            maxLength={200}
            placeholder="e.g. Royal College Sports Complex, Colombo 07"
            className={inputClass}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
      </section>

      {/* Event Banner */}
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Event banner</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Upload a high-resolution banner image for the event page. Recommended size: 1200x500 (approx 21:9). Max size: 5 MB.
        </p>

        {bannerUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
            <img
              src={bannerUrl}
              alt="Event banner preview"
              className="max-h-60 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => setBannerUrl("")}
              className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition cursor-pointer"
            >
              Remove banner
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50 hover:bg-slate-100/55 transition relative">
            <svg
              className="mx-auto h-10 w-10 text-slate-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 flex text-sm text-slate-600">
              <label
                htmlFor="banner-upload"
                className="relative cursor-pointer rounded-md font-semibold text-orange-600 focus-within:outline-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 hover:text-orange-500"
              >
                <span>Upload a banner image</span>
                <input
                  id="banner-upload"
                  name="banner-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingBanner}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setError(null);
                    setUploadingBanner(true);
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    
                    try {
                      const res = await fetch("/api/admin/events/banner", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        setError(data.error ?? "Failed to upload image.");
                        return;
                      }
                      setBannerUrl(data.bannerUrl);
                    } catch {
                      setError("Could not upload banner. Please try again.");
                    } finally {
                      setUploadingBanner(false);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">PNG, JPG, WebP up to 5MB</p>
            {uploadingBanner && (
              <span className="mt-2 text-xs font-semibold text-orange-600 animate-pulse font-sans">
                Uploading banner...
              </span>
            )}
          </div>
        )}
      </section>

      {/* Date & time */}
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Date &amp; time</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Leave the start empty to show &ldquo;Date TBA&rdquo; — the countdown
          starts once you set it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-starts" className={labelClass}>
              Event starts
            </label>
            <input
              id="ev-starts"
              type="datetime-local"
              className={inputClass}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ev-gates" className={labelClass}>
              Gates open <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ev-gates"
              type="datetime-local"
              className={inputClass}
              value={gatesOpenAt}
              onChange={(e) => setGatesOpenAt(e.target.value)}
            />
          </div>
        </div>

        {/* Schedule rows */}
        <div>
          <p className={labelClass}>
            Schedule highlights <span className="font-normal text-slate-400">(optional, e.g. &ldquo;Kick-off — 4:15 PM&rdquo;)</span>
          </p>
          <div className="space-y-2">
            {schedule.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label="Schedule label"
                  maxLength={60}
                  placeholder="Label"
                  className={inputClass}
                  value={row.label}
                  onChange={(e) => updateSchedule(i, "label", e.target.value)}
                />
                <input
                  aria-label="Schedule value"
                  maxLength={120}
                  placeholder="Value"
                  className={inputClass}
                  value={row.value}
                  onChange={(e) => updateSchedule(i, "value", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setSchedule((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-full px-3 text-sm font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove schedule row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {schedule.length < 12 && (
            <button
              type="button"
              onClick={() => setSchedule((prev) => [...prev, { label: "", value: "" }])}
              className="mt-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              + Add schedule row
            </button>
          )}
        </div>
      </section>

      {/* Teams / versus module */}
      <section className={sectionClass}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={hasTeams}
            onChange={(e) => setHasTeams(e.target.checked)}
            className="mt-1 h-4 w-4 accent-orange-600"
          />
          <span>
            <span className="block text-base font-bold text-slate-900">
              Versus / rivalry event
            </span>
            <span className="block text-sm text-slate-500">
              Adds a dramatic team-vs-team section to your event page (e.g.
              Royal vs Trinity).
            </span>
          </span>
        </label>

        {hasTeams && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["home", "away"] as const).map((side) => (
              <div key={side} className="space-y-3 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {side === "home" ? "Side one" : "Side two"}
                </p>
                <input
                  aria-label={`${side} team name`}
                  required={hasTeams}
                  maxLength={80}
                  placeholder="Team name"
                  className={inputClass}
                  value={teams[side].name}
                  onChange={(e) =>
                    setTeams((prev) => ({ ...prev, [side]: { ...prev[side], name: e.target.value } }))
                  }
                />
                <input
                  aria-label={`${side} team city`}
                  maxLength={80}
                  placeholder="City (optional)"
                  className={inputClass}
                  value={teams[side].city}
                  onChange={(e) =>
                    setTeams((prev) => ({ ...prev, [side]: { ...prev[side], city: e.target.value } }))
                  }
                />
                <input
                  aria-label={`${side} team crest URL`}
                  maxLength={300}
                  placeholder="Crest image URL (optional)"
                  className={inputClass}
                  value={teams[side].crest}
                  onChange={(e) =>
                    setTeams((prev) => ({ ...prev, [side]: { ...prev[side], crest: e.target.value } }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seating & pricing */}
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Seating &amp; pricing</h2>
        {seatingLocked && (
          <p className="-mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
            Seats have already been booked. You can still <strong>grow</strong>{" "}
            the plan — add rows, add seats per row, move the aisles — but the
            price is locked and you can&apos;t shrink it below a seat someone
            has already booked.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="ev-rows" className={labelClass}>
              Rows (A–{String.fromCharCode(64 + Math.min(Math.max(rowCount, 1), 26))})
            </label>
            <input
              id="ev-rows"
              type="number"
              min={1}
              max={26}
              required
              className={inputClass}
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="ev-spr" className={labelClass}>
              Seats per row
            </label>
            <input
              id="ev-spr"
              type="number"
              min={1}
              max={200}
              required
              className={inputClass}
              value={seatsPerRow}
              onChange={(e) => setSeatsPerRow(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="ev-price" className={labelClass}>
              Price per seat (Rs)
            </label>
            <input
              id="ev-price"
              type="number"
              min={0}
              max={1000000}
              required
              disabled={seatingLocked}
              className={inputClass}
              value={pricePerSeat}
              onChange={(e) => setPricePerSeat(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="ev-max" className={labelClass}>
              Max seats / booking
            </label>
            <input
              id="ev-max"
              type="number"
              min={1}
              max={50}
              required
              className={inputClass}
              value={maxSeats}
              onChange={(e) => setMaxSeats(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label htmlFor="ev-blocks" className={labelClass}>
            Seat blocks{" "}
            <span className="font-normal text-slate-400">
              (comma-separated, must add up to seats per row — aisles go between blocks)
            </span>
          </label>
          <input
            id="ev-blocks"
            placeholder="e.g. 20, 35, 20"
            className={inputClass}
            value={blocksText}
            onChange={(e) => setBlocksText(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400">
          {rowCount} rows × {seatsPerRow} seats = {rowCount * seatsPerRow} seats total
        </p>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={collectBatch}
            onChange={(e) => setCollectBatch(e.target.checked)}
            className="mt-1 h-4 w-4 accent-orange-600"
          />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Collect a batch year</span>{" "}
            (&ldquo;Class of&rdquo;) from attendees — for alumni events.
          </span>
        </label>

        {collectBatch && (
          <div>
            <label htmlFor="ev-non-batch" className={labelClass}>
              Option for attendees outside the batch{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ev-non-batch"
              maxLength={40}
              placeholder="e.g. Non RC"
              className={inputClass}
              value={nonBatchLabel}
              onChange={(e) => setNonBatchLabel(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Adds this choice beside the batch years, for family, friends and
              guests who were never part of the cohort. Leave empty to require
              a year from everyone.
            </p>
          </div>
        )}
      </section>

      {/* Bank details */}
      <section className={sectionClass}>
        <h2 className="text-base font-bold text-slate-900">Payment account</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Attendees transfer the ticket fee straight to this account and upload
          the slip — you verify each payment before tickets are issued.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-bank" className={labelClass}>
              Bank
            </label>
            <input
              id="ev-bank"
              maxLength={120}
              placeholder="e.g. Commercial Bank"
              className={inputClass}
              value={bank.name}
              onChange={(e) => setBank({ ...bank, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="ev-acc-name" className={labelClass}>
              Account name
            </label>
            <input
              id="ev-acc-name"
              maxLength={120}
              className={inputClass}
              value={bank.accountName}
              onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="ev-acc-no" className={labelClass}>
              Account number
            </label>
            <input
              id="ev-acc-no"
              maxLength={60}
              className={inputClass}
              value={bank.accountNumber}
              onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="ev-branch" className={labelClass}>
              Branch
            </label>
            <input
              id="ev-branch"
              maxLength={120}
              className={inputClass}
              value={bank.branch}
              onChange={(e) => setBank({ ...bank, branch: e.target.value })}
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          Changes saved.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Submit event for review →"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
