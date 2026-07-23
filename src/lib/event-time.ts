// Pure event-timing helpers, safe to import from client components
// (the Countdown ticks in the browser using the same phase logic the
// server uses to split upcoming/completed listings).

export type EventPhase = "tba" | "upcoming" | "happening" | "completed";

/** How long after kick-off an event counts as "happening" before completing. */
export const EVENT_HAPPENING_MS = 12 * 60 * 60 * 1000;

export function eventPhase(startsAt: string | null, now: Date = new Date()): EventPhase {
  if (!startsAt) return "tba";
  const start = new Date(startsAt).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t < start + EVENT_HAPPENING_MS) return "happening";
  return "completed";
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownTo(startsAt: string, now: Date = new Date()): CountdownParts {
  const ms = Math.max(0, new Date(startsAt).getTime() - now.getTime());
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// All events are in Sri Lanka, so timestamps are pinned to Colombo rather than
// left to the runtime's zone: server renders (and ISR caches) run in UTC on the
// host, which would show a 15:45 kick-off as 10:15.
export const EVENT_TIME_ZONE = "Asia/Colombo";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  timeZone: EVENT_TIME_ZONE,
};

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
};

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...SHORT_DATE_FORMAT,
  ...TIME_FORMAT,
};

export function formatEventDate(startsAt: string | null): string {
  if (!startsAt) return "Date TBA";
  return new Date(startsAt).toLocaleDateString("en-GB", DATE_FORMAT);
}

/** Clock time only — kick-off, gate scans. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", TIME_FORMAT);
}

export const formatEventTime = formatTime;

/** Short date, no weekday — record columns like "registered on". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", SHORT_DATE_FORMAT);
}

/** Date + time — check-ins, slip uploads, anything audit-trail shaped. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", DATE_TIME_FORMAT);
}
