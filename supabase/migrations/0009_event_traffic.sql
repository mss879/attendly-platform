-- Attendly — Feature 9: event page traffic, super admin only
--
-- Why views are recorded from the browser rather than counted on the server:
-- /events/[slug] is ISR-cached (revalidate = 60), so most visits are served
-- straight from the cache and never reach our code. A small beacon on the page
-- posts to /api/track instead, and that route inserts here with the service
-- role. As a side effect this also drops nearly every crawler, since almost
-- none of them run JavaScript.
--
-- Privacy: no IP address and no user-agent string is stored. Unique visitors
-- are counted with a salted hash that folds in the UTC date, so the same
-- person on two days produces two unrelated hashes — the column cannot be
-- used to follow anyone across days, and there is nothing to leak if the
-- table is ever exposed.
--
-- Visibility: the super admin, and only the super admin. Organizers manage
-- their own events but deliberately do not get traffic figures.

-- Wrapped in an explicit transaction: this runs against a live database with
-- people booking, so it applies all-or-nothing. A partial paste (the SQL
-- editor runs only the selected text when there is a selection) then fails
-- with nothing applied, instead of leaving half a schema behind.
begin;

create table if not exists public.event_page_views (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,

  -- Which step of the funnel: 'event' = /events/[slug], 'book' = its
  -- booking page. Kept in one table so the two are always queried together.
  page text not null default 'event'
    check (page in ('event', 'book')),

  -- sha256(salt + UTC date + ip + user agent) — see the privacy note above.
  visitor_hash text not null,

  -- Host only ("google.com"), never the full referring URL: that can carry
  -- search terms and other personal data in its query string.
  referrer_host text,

  viewed_at timestamptz not null default now()
);

comment on table public.event_page_views is
  'One row per event-page view, written by /api/track. Readable by the super admin only.';

-- Every dashboard query is "this event, recent first" or "everything in the
-- last N days", so index for both.
create index if not exists event_page_views_event_time_idx
  on public.event_page_views (event_id, viewed_at desc);
create index if not exists event_page_views_time_idx
  on public.event_page_views (viewed_at desc);

alter table public.event_page_views enable row level security;

-- Super admin only, and read only. There is deliberately no insert policy for
-- anon or authenticated: the beacon route writes with the service role (which
-- bypasses RLS), so a visitor has no path to forge views or read anyone's
-- numbers even if they get hold of the anon key.
drop policy if exists "super_admin_read_traffic" on public.event_page_views;
create policy "super_admin_read_traffic"
  on public.event_page_views for select
  to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Aggregates. PostgREST cannot express group-by, and pulling every raw row
-- into the app to count it in JS would not survive a busy event, so the
-- rollups live here.
--
-- These are SECURITY INVOKER (the default) on purpose: they inherit the
-- caller's RLS, so an organizer who calls them directly gets an empty result
-- with no guard needed in the function body. The app calls them with the
-- service role behind requireSuperAdmin().
-- ---------------------------------------------------------------------------

-- Per-event totals for the dashboard table.
create or replace function public.event_traffic(p_days integer default 30)
returns table (
  event_id uuid,
  views bigint,
  visitors bigint,
  book_views bigint,
  views_24h bigint,
  visitors_24h bigint,
  last_view_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    v.event_id,
    count(*) filter (where v.page = 'event'),
    count(distinct v.visitor_hash) filter (where v.page = 'event'),
    count(*) filter (where v.page = 'book'),
    count(*) filter (
      where v.page = 'event' and v.viewed_at > now() - interval '24 hours'
    ),
    count(distinct v.visitor_hash) filter (
      where v.page = 'event' and v.viewed_at > now() - interval '24 hours'
    ),
    max(v.viewed_at)
  from public.event_page_views v
  where v.viewed_at > now() - make_interval(days => p_days)
  group by v.event_id;
$$;

-- Daily series for the sparkline. Days are Colombo days, not UTC days: every
-- event is in Sri Lanka, and a UTC bucket would cut each day at 05:30 local
-- and split a single evening's traffic across two bars.
create or replace function public.event_traffic_daily(p_days integer default 14)
returns table (
  event_id uuid,
  day date,
  views bigint,
  visitors bigint
)
language sql
stable
set search_path = public
as $$
  select
    v.event_id,
    (v.viewed_at at time zone 'Asia/Colombo')::date,
    count(*),
    count(distinct v.visitor_hash)
  from public.event_page_views v
  where v.page = 'event'
    and v.viewed_at > now() - make_interval(days => p_days)
  group by v.event_id, (v.viewed_at at time zone 'Asia/Colombo')::date;
$$;

-- Where the traffic came from. Null referrer_host = typed the URL, opened it
-- from a chat app, or the referrer was stripped — reported as "Direct".
create or replace function public.event_traffic_referrers(p_days integer default 30)
returns table (
  event_id uuid,
  referrer_host text,
  views bigint
)
language sql
stable
set search_path = public
as $$
  select
    v.event_id,
    coalesce(v.referrer_host, 'Direct'),
    count(*)
  from public.event_page_views v
  where v.page = 'event'
    and v.viewed_at > now() - make_interval(days => p_days)
  group by v.event_id, coalesce(v.referrer_host, 'Direct');
$$;

-- Anon never needs these; authenticated callers are filtered by RLS anyway.
revoke all on function public.event_traffic(integer) from public;
revoke all on function public.event_traffic_daily(integer) from public;
revoke all on function public.event_traffic_referrers(integer) from public;

grant execute on function public.event_traffic(integer) to authenticated, service_role;
grant execute on function public.event_traffic_daily(integer) to authenticated, service_role;
grant execute on function public.event_traffic_referrers(integer) to authenticated, service_role;

commit;

-- Sanity check — should return one row reading: event_page_views | 3
select
  to_regclass('public.event_page_views')::text as table_created,
  (select count(*) from pg_proc
    where proname in ('event_traffic', 'event_traffic_daily', 'event_traffic_referrers')
  ) as functions_created;
