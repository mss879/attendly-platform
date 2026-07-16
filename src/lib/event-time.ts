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

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

export function formatEventDate(startsAt: string | null): string {
  if (!startsAt) return "Date TBA";
  return new Date(startsAt).toLocaleDateString("en-GB", DATE_FORMAT);
}

export function formatEventTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString("en-GB", TIME_FORMAT);
}
