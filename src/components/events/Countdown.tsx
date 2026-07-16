"use client";

import { useEffect, useState } from "react";
import { countdownTo, eventPhase } from "@/lib/event-time";

// Live countdown to an event's start. Renders a placeholder until mounted
// (the ticking value only exists client-side, so SSR renders no digits).

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[3.5rem] flex-col items-center rounded-xl bg-white/60 px-2 py-2 ring-1 ring-white/60 backdrop-blur-sm sm:min-w-[4.5rem] sm:px-3 sm:py-3">
      <span className="font-mono text-xl font-bold tabular-nums tracking-tight text-black sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-orange-700/80 sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

export function Countdown({
  startsAt,
  variant = "chip",
}: {
  startsAt: string | null;
  /** "chip" = compact inline pill; "panel" = big tiles for the event page. */
  variant?: "chip" | "panel";
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // First value lands via a macrotask (not synchronously in the effect
    // body), then the interval keeps it ticking.
    const kickoff = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(id);
    };
  }, []);

  const phase = eventPhase(startsAt, now ?? undefined);

  if (variant === "chip") {
    let text: string;
    if (phase === "tba") text = "Date TBA";
    else if (phase === "happening") text = "Happening now";
    else if (phase === "completed") text = "Completed";
    else if (!now) text = "…";
    else {
      const c = countdownTo(startsAt!, now);
      text =
        c.days > 0
          ? `${c.days}d ${String(c.hours).padStart(2, "0")}h ${String(c.minutes).padStart(2, "0")}m`
          : `${String(c.hours).padStart(2, "0")}h ${String(c.minutes).padStart(2, "0")}m ${String(c.seconds).padStart(2, "0")}s`;
    }
    const tone =
      phase === "happening"
        ? "bg-emerald-100/80 text-emerald-700 ring-emerald-200/70"
        : phase === "completed"
          ? "bg-slate-100/80 text-slate-500 ring-slate-200/70"
          : "bg-orange-100/80 text-orange-700 ring-orange-200/70";
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold tabular-nums ring-1 ${tone}`}
      >
        {phase === "upcoming" && (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" strokeLinecap="round" />
          </svg>
        )}
        {phase === "happening" && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        {text}
      </span>
    );
  }

  // panel variant
  if (phase === "tba") {
    return (
      <p className="inline-flex rounded-full bg-white/70 px-5 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-200/70">
        Date to be announced
      </p>
    );
  }
  if (phase === "happening") {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-5 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200/70">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        Happening now — see you at the gate!
      </p>
    );
  }
  if (phase === "completed") {
    return (
      <p className="inline-flex rounded-full bg-slate-100/80 px-5 py-2 text-sm font-bold text-slate-500 ring-1 ring-slate-200/70">
        This event has ended
      </p>
    );
  }

  const c = now ? countdownTo(startsAt!, now) : { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 ${now ? "" : "opacity-40"}`}
      aria-label="Countdown to event start"
    >
      <Unit value={c.days} label="days" />
      <Unit value={c.hours} label="hrs" />
      <Unit value={c.minutes} label="min" />
      <Unit value={c.seconds} label="sec" />
    </div>
  );
}
