"use client";

import { useEffect, useRef } from "react";
import type { TrafficPage } from "@/lib/types";

/**
 * Records one view of an event page.
 *
 * This runs in the browser rather than on the server because event pages are
 * ISR-cached — a cached response is served without our code running, so a
 * server-side counter would miss almost every real visit.
 *
 * Renders nothing, never blocks paint, and swallows its own errors: traffic
 * reporting must not be able to break the page it is measuring.
 */
export function PageViewTracker({
  eventId,
  page = "event",
}: {
  eventId: string;
  page?: TrafficPage;
}) {
  // Effects run twice under StrictMode in development. The ref survives that
  // remount, so a visit is only ever counted once.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    // keepalive lets the request finish even if the visitor navigates away
    // straight after landing — otherwise bounces would go uncounted.
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId, page }),
      keepalive: true,
    }).catch(() => {});
  }, [eventId, page]);

  return null;
}
