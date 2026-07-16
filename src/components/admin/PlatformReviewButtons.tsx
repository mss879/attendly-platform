"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Approve/reject controls for the super-admin pending queue.

export function PlatformReviewButtons({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    if (busy) return;
    if (
      action === "reject" &&
      !window.confirm("Reject this event? The organizer will be emailed and can edit + resubmit.")
    ) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/platform/review-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => review("approve")}
          disabled={busy !== null}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "approve" ? "Approving…" : "✓ Approve & publish"}
        </button>
        <button
          onClick={() => review("reject")}
          disabled={busy !== null}
          className="rounded-full bg-white px-5 py-2 text-sm font-bold text-red-600 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
    </div>
  );
}
