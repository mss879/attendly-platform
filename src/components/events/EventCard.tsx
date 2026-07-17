import Link from "next/link";
import { Countdown } from "./Countdown";
import { formatLKR } from "@/lib/seating";
import { formatEventDate, formatEventTime } from "@/lib/event-time";
import type { EventRow } from "@/lib/types";

// Event card used on the landing strip and the /events hub.

export function EventCard({
  event,
  completed = false,
}: {
  event: EventRow;
  completed?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group relative block overflow-hidden rounded-none bg-white/40 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/55 hover:shadow-xl hover:shadow-orange-950/10 ${
        completed ? "opacity-70 saturate-[0.75]" : ""
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: completed
            ? "radial-gradient(120% 120% at 100% 100%, rgba(100,116,139,0.15) 0%, rgba(255,255,255,0) 55%)"
            : "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.30) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 120% at 0% 0%, rgba(220,38,38,0.10) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      {event.banner_url && (
        <div className="relative w-full overflow-hidden border-b border-orange-950/5">
          <img
            src={event.banner_url}
            alt={event.name}
            className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
        </div>
      )}
      <div className="p-6 relative">
        <div className="flex flex-wrap items-center gap-2">
          {event.edition && (
            <span className="inline-flex rounded-full bg-orange-100/80 px-2.5 py-1 text-[11px] font-bold text-orange-700">
              {event.edition}
            </span>
          )}
          {completed ? (
            <span className="inline-flex rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              Completed
            </span>
          ) : (
            <Countdown startsAt={event.starts_at} />
          )}
        </div>

        <h3 className="mt-3 text-xl font-bold tracking-tight text-black sm:text-2xl">
          {event.name}
        </h3>
        {event.subtitle && (
          <p className="mt-1 text-sm text-black/70">{event.subtitle}</p>
        )}

        <dl className="mt-4 space-y-1.5 text-sm text-black">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.5a6.5 6.5 0 0 1 6.5 6.3C18.5 15.6 12 21 12 21Z" />
              <circle cx="12" cy="10.8" r="2.3" />
            </svg>
            <dd className="truncate">{event.venue || "Venue TBA"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="5.5" width="16" height="15" rx="2" />
              <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
            </svg>
            <dd>
              {formatEventDate(event.starts_at)}
              {event.starts_at && (
                <span className="text-black/60"> · {formatEventTime(event.starts_at)}</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between border-t border-dashed border-orange-950/10 pt-4">
          <span className="text-sm font-bold text-black">
            {formatLKR(event.seating.pricePerSeat)}
            <span className="font-medium text-black/60"> / seat</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-700">
            {completed ? "View event" : "View & book"}
            <span className="inline-block transition group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
