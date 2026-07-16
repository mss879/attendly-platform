"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewButtons({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "verify" | "reject") {
    setError(null);
    setBusy(action);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => decide("verify")}
          disabled={busy !== null}
          className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {busy === "verify" ? "Verifying…" : "✓ Verify payment & issue ticket"}
        </button>
        <button
          onClick={() => decide("reject")}
          disabled={busy !== null}
          className="w-full rounded-full bg-red-50 px-5 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {busy === "reject" ? "Rejecting…" : "✕ Reject slip"}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
