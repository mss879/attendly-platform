"use client";

import { useRef, useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";

type ScanResult =
  | {
      result: "ok" | "already";
      participant: {
        name: string;
        batch: string;
        ticketNumber: string;
        seatNo: string | null;
        checkedInAt: string | null;
      };
    }
  | { result: "not_found" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GateScanner({ eventId }: { eventId: string }) {
  const [paused, setPaused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  // Guards against the scanner firing multiple times for one QR.
  const inFlight = useRef(false);

  async function checkIn(payload: { qrToken?: string; ticketNumber?: string }) {
    setError(null);
    setChecking(true);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Check-in failed — try again.");
        return;
      }
      setResult(data as ScanResult);
      if (navigator.vibrate) navigator.vibrate(data.result === "ok" ? 100 : [80, 60, 80]);
    } catch {
      setError("Could not reach the server — check the connection and retry.");
    } finally {
      setChecking(false);
    }
  }

  async function handleScan(codes: IDetectedBarcode[]) {
    const value = codes[0]?.rawValue?.trim();
    if (!value || inFlight.current) return;
    inFlight.current = true;
    setPaused(true);

    if (UUID_RE.test(value)) {
      await checkIn({ qrToken: value.toLowerCase() });
    } else if (/^TKT-\d+$/i.test(value)) {
      await checkIn({ ticketNumber: value.toUpperCase() });
    } else {
      setResult({ result: "not_found" });
    }
  }

  function scanNext() {
    setResult(null);
    setError(null);
    inFlight.current = false;
    setPaused(false);
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Hold onto the element: React nulls out currentTarget across the await,
    // so resetting afterwards would silently never happen and the previous
    // seat's number would linger in the field.
    const formEl = e.currentTarget;
    const raw = String(new FormData(formEl).get("ticketNumber") ?? "")
      .trim()
      .toUpperCase();
    if (!raw) return;
    const normalized = raw.startsWith("TKT-") ? raw : `TKT-${raw}`;
    if (!/^TKT-\d+$/.test(normalized)) {
      setError("Enter a ticket number like TKT-0012.");
      return;
    }
    setManualBusy(true);
    setPaused(true);
    inFlight.current = true;
    await checkIn({ ticketNumber: normalized });
    setManualBusy(false);
    formEl.reset();
  }

  return (
    <div className="space-y-4">
      {/* Result banner */}
      {result && (
        <div
          className={`rounded-2xl border-2 p-6 text-center ${
            result.result === "ok"
              ? "border-emerald-400 bg-emerald-50"
              : "border-red-400 bg-red-50"
          }`}
        >
          {result.result === "ok" && (
            <>
              <p className="text-4xl">✅</p>
              <p className="mt-2 text-xl font-bold text-emerald-800">
                Welcome, {result.participant.name}!
              </p>
              {result.participant.seatNo && (
                <p className="mt-3 inline-block rounded-xl bg-emerald-600 px-5 py-2 font-mono text-3xl font-bold tracking-tight text-white">
                  {result.participant.seatNo}
                </p>
              )}
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {result.participant.batch
                  ? `Class of ${result.participant.batch} · `
                  : ""}
                {result.participant.ticketNumber}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                Checked in successfully
                {result.participant.seatNo ? " — this seat only." : "."}
              </p>
            </>
          )}
          {result.result === "already" && (
            <>
              <p className="text-4xl">⛔</p>
              <p className="mt-2 text-xl font-bold text-red-800">
                ALREADY CHECKED IN
              </p>
              {result.participant.seatNo && (
                <p className="mt-3 inline-block rounded-xl bg-red-600 px-5 py-2 font-mono text-3xl font-bold tracking-tight text-white">
                  {result.participant.seatNo}
                </p>
              )}
              <p className="mt-2 text-sm font-semibold text-red-700">
                {result.participant.name} ·{" "}
                {result.participant.batch
                  ? `Class of ${result.participant.batch} · `
                  : ""}
                {result.participant.ticketNumber}
              </p>
              {result.participant.checkedInAt && (
                <p className="mt-1 text-xs text-red-600">
                  First check-in:{" "}
                  {new Date(result.participant.checkedInAt).toLocaleTimeString()}
                </p>
              )}
            </>
          )}
          {result.result === "not_found" && (
            <>
              <p className="text-4xl">❓</p>
              <p className="mt-2 text-xl font-bold text-red-800">TICKET NOT FOUND</p>
              <p className="mt-1 text-sm text-red-700">
                This QR code / ticket number is not a valid ticket for this event.
              </p>
            </>
          )}
          <button
            onClick={scanNext}
            className="mt-4 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Scan next ticket
          </button>
        </div>
      )}

      {checking && !result && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-500">
          Checking ticket…
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={scanNext} className="ml-2 font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Camera */}
      <div className="overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-black/[0.06]">
        <Scanner
          onScan={handleScan}
          onError={() =>
            setError(
              "Camera unavailable — allow camera access (requires HTTPS on phones) or use manual entry below."
            )
          }
          paused={paused}
          formats={["qr_code"]}
          components={{ finder: true }}
          sound={false}
          styles={{ container: { width: "100%" } }}
        />
      </div>

      {/* Manual fallback */}
      <form
        onSubmit={handleManualSubmit}
        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"
      >
        <label
          htmlFor="ticketNumber"
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          Manual entry (camera fallback)
        </label>
        <div className="flex gap-2">
          <input
            id="ticketNumber"
            name="ticketNumber"
            placeholder="TKT-0012"
            autoComplete="off"
            className="w-full rounded-full border border-slate-200 px-4 py-2.5 font-mono text-sm uppercase shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="submit"
            disabled={manualBusy}
            className="whitespace-nowrap rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
          >
            {manualBusy ? "Checking…" : "Check in"}
          </button>
        </div>
      </form>
    </div>
  );
}
