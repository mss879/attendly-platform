import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { EVENT_TIME_ZONE } from "./event-time";
import type {
  EventTraffic,
  EventTrafficDay,
  EventTrafficReferrer,
  TrafficPage,
} from "./types";

/**
 * Event page traffic. Views are collected by the beacon in
 * components/events/PageViewTracker and read back here for the super-admin
 * dashboard — see supabase/migrations/0009_event_traffic.sql for why counting
 * happens in the browser rather than during the server render.
 */

/** Default reporting window for the dashboard. */
export const TRAFFIC_WINDOW_DAYS = 30;

/** Days of history in the sparkline. */
export const TRAFFIC_SPARK_DAYS = 14;

/**
 * Salt for the visitor hash. A dedicated TRAFFIC_SALT is preferred; falling
 * back to the service-role key means the feature works without adding an env
 * var, and that key is server-only and already secret. Either way the hash is
 * one-way and re-salted daily, so there is nothing to reverse.
 */
function salt(): string {
  return process.env.TRAFFIC_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/**
 * Pseudonymous per-day visitor id. The UTC date is part of the input, so the
 * same browser gets an unrelated hash tomorrow: good enough to count today's
 * unique visitors, useless for following anyone over time.
 *
 * We never store the ip or user agent themselves.
 */
export function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt()}|${day}|${ip}|${userAgent}`)
    .digest("hex");
}

/**
 * Host of the referring page, or null when there isn't a usable one. Only the
 * host is kept — a full referrer URL can carry search terms and other personal
 * data in its query string.
 *
 * Same-origin referrers are dropped: someone clicking through from the events
 * hub to an event page is our own navigation, not a traffic source.
 */
export function referrerHost(referrer: string | null, selfHost: string): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host) return null;
  return host === selfHost.replace(/^www\./, "") ? null : host;
}

/**
 * Obvious crawlers and preview fetchers, dropped before they reach the table.
 * The beacon requires JavaScript so this catches very little on its own — it
 * is here for the headless-browser crawlers that do run it.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|preview|scrape|monitor|lighthouse|pingdom|curl|wget|python-requests|axios|node-fetch/i;

export function looksLikeBot(userAgent: string): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** Record one view. Failures are the caller's to swallow — see /api/track. */
export async function recordPageView(input: {
  eventId: string;
  page: TrafficPage;
  visitorHash: string;
  referrerHost: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("event_page_views").insert({
    event_id: input.eventId,
    page: input.page,
    visitor_hash: input.visitorHash,
    referrer_host: input.referrerHost,
  });
  if (error) throw error;
}

export interface TrafficReport {
  /**
   * False when the traffic tables/functions are not reachable — almost always
   * "migration 0009 has not been run yet". Lets the dashboard say so instead
   * of showing a confident set of zeroes.
   */
  available: boolean;
  /** Totals per event id, for the reporting window. */
  totals: Map<string, EventTraffic>;
  /** Daily views per event id, oldest first. */
  daily: Map<string, EventTrafficDay[]>;
  /** Top referring hosts per event id, busiest first. */
  referrers: Map<string, EventTrafficReferrer[]>;
}

const UNAVAILABLE: TrafficReport = {
  available: false,
  totals: new Map(),
  daily: new Map(),
  referrers: new Map(),
};

function groupBy<T extends { event_id: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const list = out.get(row.event_id);
    if (list) list.push(row);
    else out.set(row.event_id, [row]);
  }
  return out;
}

/**
 * Everything the traffic dashboard needs, in three grouped lookups.
 *
 * Callers must gate on requireSuperAdmin() first: this reads with the service
 * role, so it is not itself an authorization boundary.
 */
export async function getTrafficReport(
  days: number = TRAFFIC_WINDOW_DAYS,
  sparkDays: number = TRAFFIC_SPARK_DAYS
): Promise<TrafficReport> {
  const supabase = createAdminClient();

  // The client is untyped (no generated Database types in this project), so
  // rpc() hands back `any` — the row shapes are asserted against the return
  // signatures in migration 0009.
  const [totals, daily, referrers] = await Promise.all([
    supabase.rpc("event_traffic", { p_days: days }),
    supabase.rpc("event_traffic_daily", { p_days: sparkDays }),
    supabase.rpc("event_traffic_referrers", { p_days: days }),
  ]);

  // The table may not exist yet (migration 0009 not run). Degrade to "traffic
  // unavailable" rather than taking the whole platform area down.
  const failure = totals.error ?? daily.error ?? referrers.error;
  if (failure) {
    console.error("[traffic] report failed:", failure);
    return UNAVAILABLE;
  }

  const dailyByEvent = groupBy((daily.data ?? []) as EventTrafficDay[]);
  for (const rows of dailyByEvent.values()) {
    rows.sort((a, b) => a.day.localeCompare(b.day));
  }

  const referrersByEvent = groupBy((referrers.data ?? []) as EventTrafficReferrer[]);
  for (const rows of referrersByEvent.values()) {
    rows.sort((a, b) => b.views - a.views);
  }

  return {
    available: true,
    totals: new Map(
      ((totals.data ?? []) as EventTraffic[]).map((row) => [row.event_id, row])
    ),
    daily: dailyByEvent,
    referrers: referrersByEvent,
  };
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The last `days` Colombo dates as YYYY-MM-DD, oldest first — the same shape
 * event_traffic_daily() buckets by. Sri Lanka has no DST, so stepping back in
 * whole days is exact.
 */
function recentDays(days: number): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(DAY_FORMAT.format(new Date(now - i * 86_400_000)));
  }
  return out;
}

export interface DailyPoint {
  day: string;
  views: number;
}

/**
 * Pad an event's daily rows out to a full window. Days with no traffic come
 * back from Postgres as missing rows, not zeroes, and a sparkline that skips
 * them would silently compress quiet stretches and misreport the trend.
 */
export function fillDailySeries(
  rows: EventTrafficDay[] | undefined,
  days: number = TRAFFIC_SPARK_DAYS
): DailyPoint[] {
  const byDay = new Map((rows ?? []).map((r) => [r.day, r.views]));
  return recentDays(days).map((day) => ({ day, views: byDay.get(day) ?? 0 }));
}
