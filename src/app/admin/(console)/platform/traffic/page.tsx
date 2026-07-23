import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { TrafficSparkline } from "@/components/admin/TrafficSparkline";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/supabase/auth";
import { formatDateTime } from "@/lib/event-time";
import {
  TRAFFIC_SPARK_DAYS,
  TRAFFIC_WINDOW_DAYS,
  fillDailySeries,
  getTrafficReport,
} from "@/lib/traffic";
import type { EventRow } from "@/lib/types";

// Traffic is super-admin-only. requireSuperAdmin() redirects organizers to
// /admin, and this page is not linked anywhere they can see.
export const dynamic = "force-dynamic";

export const metadata = { title: "Traffic" };

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default async function TrafficPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();

  const [{ data: events }, report] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<EventRow[]>(),
    getTrafficReport(),
  ]);

  const all = events ?? [];

  // Busiest first — with no traffic at all this keeps the platform's own
  // ordering (newest event first) rather than shuffling rows arbitrarily.
  const ranked = [...all].sort(
    (a, b) =>
      (report.totals.get(b.id)?.views ?? 0) - (report.totals.get(a.id)?.views ?? 0)
  );

  const totals = [...report.totals.values()];
  const sum = (pick: (t: (typeof totals)[number]) => number) =>
    totals.reduce((n, t) => n + pick(t), 0);

  const totalViews = sum((t) => t.views);
  const totalVisitors = sum((t) => t.visitors);
  const totalBookViews = sum((t) => t.book_views);
  const views24h = sum((t) => t.views_24h);

  return (
    <FadeIn stagger>
      <div className="mb-7">
        <Link
          href="/admin/platform"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
        >
          ← Platform
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Traffic
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Visits to each event page over the last {TRAFFIC_WINDOW_DAYS} days.
          Only you can see this — organizers don&apos;t get traffic figures.
        </p>
      </div>

      {!report.available ? (
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Traffic isn&apos;t set up yet.</p>
          <p className="mt-1 text-amber-800">
            Run{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
              supabase/migrations/0009_event_traffic.sql
            </code>{" "}
            in the Supabase SQL editor, then reload this page. Views are
            recorded from the moment that migration lands — there is no history
            before it.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Page views"
              value={totalViews.toLocaleString("en-LK")}
              hint={`across ${all.length} event${all.length === 1 ? "" : "s"}`}
            />
            <Tile
              label="Unique visitors"
              value={totalVisitors.toLocaleString("en-LK")}
              hint="counted once per person per day"
            />
            <Tile
              label="Last 24 hours"
              value={views24h.toLocaleString("en-LK")}
              hint="page views"
            />
            <Tile
              label="Reached booking"
              value={totalBookViews.toLocaleString("en-LK")}
              hint={
                totalViews > 0
                  ? `${Math.round((totalBookViews / totalViews) * 100)}% of views`
                  : "no views yet"
              }
            />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              By event
            </h2>

            {totalViews === 0 && (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No views recorded yet. Counting starts when someone opens an
                event page — reload after the next visit.
              </p>
            )}

            <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5 font-semibold">Event</th>
                    <th className="px-5 py-3.5 font-semibold">
                      Last {TRAFFIC_SPARK_DAYS} days
                    </th>
                    <th className="px-5 py-3.5 font-semibold">Views</th>
                    <th className="px-5 py-3.5 font-semibold">Visitors</th>
                    <th className="px-5 py-3.5 font-semibold">To booking</th>
                    <th className="px-5 py-3.5 font-semibold">Top source</th>
                    <th className="px-5 py-3.5 font-semibold">Last view</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((event) => {
                    const t = report.totals.get(event.id);
                    const views = t?.views ?? 0;
                    const bookViews = t?.book_views ?? 0;
                    const series = fillDailySeries(report.daily.get(event.id));
                    const topReferrer = report.referrers.get(event.id)?.[0];

                    return (
                      <tr
                        key={event.id}
                        className="border-b border-slate-50 transition last:border-0 hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/admin/e/${event.id}`}
                            className="font-semibold text-slate-900 transition hover:text-orange-700"
                          >
                            {event.name}
                          </Link>
                          <span className="block text-xs text-slate-400">
                            /events/{event.slug}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <TrafficSparkline
                            days={series}
                            label={`${event.name}: ${series
                              .map((d) => `${d.day} ${d.views}`)
                              .join(", ")}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-900">
                            {views.toLocaleString("en-LK")}
                          </span>
                          {(t?.views_24h ?? 0) > 0 && (
                            <span className="ml-1.5 text-xs font-semibold text-emerald-600">
                              +{t!.views_24h} today
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {(t?.visitors ?? 0).toLocaleString("en-LK")}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {bookViews.toLocaleString("en-LK")}
                          {views > 0 && (
                            <span className="ml-1.5 text-xs text-slate-400">
                              {Math.round((bookViews / views) * 100)}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {topReferrer ? (
                            <>
                              {topReferrer.referrer_host}
                              <span className="ml-1.5 text-xs text-slate-400">
                                {topReferrer.views}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {t?.last_view_at ? formatDateTime(t.last_view_at) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Views are counted in the browser, so crawlers and link previews
              are mostly excluded. Visitors are counted once per person per day
              using a salted hash — no IP addresses are stored.
            </p>
          </section>
        </>
      )}
    </FadeIn>
  );
}
