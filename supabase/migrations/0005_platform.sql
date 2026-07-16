-- Attendly — Feature 5: Multi-event platform
-- Turns the single-event app into a platform:
--   * profiles: every auth user gets a role (super_admin | organizer)
--   * events: one row per event; organizers own events, the super admin
--     approves them ("pending" -> "published" | "rejected")
--   * registrations/booked_seats gain event_id; seats are unique per event
-- "Completed" is derived, not stored: status = 'published' AND starts_at < now().

-- ---------------------------------------------------------------------------
-- 1) Profiles: role per auth user. Rows are created by the app (service role)
--    at organizer signup. Promote the platform owner manually (see README):
--      update public.profiles set role = 'super_admin' where id = '<auth uid>';
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'organizer'
    check (role in ('super_admin', 'organizer')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

-- Existing manually-created accounts keep working as organizers.
insert into public.profiles (id, role)
select id, 'organizer' from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "read_own_profile" on public.profiles;
create policy "read_own_profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Helper for RLS policies: is the current user the super admin?
-- SECURITY DEFINER so policies on other tables may consult profiles
-- without granting direct access to it.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  -- null owner = platform-seeded event, managed by the super admin
  owner_id uuid references auth.users (id) on delete set null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- content
  name text not null,
  edition text,                    -- e.g. "Bradby Shield 2026" (badge line)
  subtitle text,
  tagline text[] not null default '{}',
  description text not null default '',
  venue text not null default '',
  schedule jsonb not null default '[]',  -- [{ "label": "...", "value": "..." }]
  teams jsonb,                     -- optional versus module: { home, away }

  -- timing (null starts_at = "Date TBA": listed as upcoming, no countdown)
  starts_at timestamptz,
  gates_open_at timestamptz,

  -- booking config
  seating jsonb not null,          -- { rows, seatsPerRow, blocks, pricePerSeat, maxSeatsPerBooking }
  bank jsonb not null default '{"name":"","accountName":"","accountNumber":"","branch":""}',
  collect_batch boolean not null default false,  -- alumni "Class of" field

  -- lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_owner_idx on public.events (owner_id);
create index if not exists events_starts_at_idx on public.events (starts_at);

alter table public.events enable row level security;

drop policy if exists "public_read_published_events" on public.events;
create policy "public_read_published_events"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "organizer_read_own_events" on public.events;
create policy "organizer_read_own_events"
  on public.events for select
  to authenticated
  using (owner_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 3) Seed the Bradby event and backfill existing bookings onto it.
--    Bank details are intentionally blank — set them in the admin event
--    settings (they used to live in BANK_* env vars).
-- ---------------------------------------------------------------------------

insert into public.events
  (id, slug, name, edition, subtitle, tagline, description, venue,
   schedule, teams, seating, collect_batch, status, published_at)
values (
  '11111111-1111-4111-8111-111111111111',
  'bradby-shield-2026',
  '80th Bradby Viewing Party',
  'Bradby Shield 2026',
  'The Grandstand Theatre Experience',
  array['One rivalry.', 'One passion.', 'One experience.'],
  'A premium open-air theatre experience where the passion of Bradby comes alive on the big screen with electrifying entertainment, great food and unforgettable memories.',
  'Royal College Sports Complex, Colombo 07',
  '[{"label": "Gates open", "value": "2:00 PM"},
    {"label": "Kick-off", "value": "4:15 PM"}]'::jsonb,
  '{"home": {"name": "Royal College", "city": "Colombo", "crest": "/royal-college.png"},
    "away": {"name": "Trinity College", "city": "Kandy", "crest": "/trinity-college.png"}}'::jsonb,
  '{"rows": ["A", "B", "C", "D", "E", "F"], "seatsPerRow": 75, "blocks": [20, 35, 20],
    "pricePerSeat": 1500, "maxSeatsPerBooking": 10}'::jsonb,
  true,
  'published',
  now()
)
on conflict (id) do nothing;

-- registrations.event_id (backfill, then enforce)
alter table public.registrations
  add column if not exists event_id uuid references public.events (id) on delete cascade;
update public.registrations
  set event_id = '11111111-1111-4111-8111-111111111111'
  where event_id is null;
alter table public.registrations alter column event_id set not null;
create index if not exists registrations_event_idx on public.registrations (event_id);

-- booked_seats.event_id: seats are now unique PER EVENT, and the seat-id
-- format is validated by the app against each event's seating config.
alter table public.booked_seats
  add column if not exists event_id uuid references public.events (id) on delete cascade;
update public.booked_seats
  set event_id = '11111111-1111-4111-8111-111111111111'
  where event_id is null;
alter table public.booked_seats alter column event_id set not null;

alter table public.booked_seats drop constraint if exists booked_seats_seat_no_key;
alter table public.booked_seats drop constraint if exists booked_seats_seat_no_check;
alter table public.booked_seats
  add constraint booked_seats_event_seat_unique unique (event_id, seat_no);
create index if not exists booked_seats_event_idx on public.booked_seats (event_id);

-- ---------------------------------------------------------------------------
-- 4) Scope the read policies: an organizer sees only their events' data;
--    the super admin sees everything. (App writes still use the service role;
--    these policies are defense in depth, as before.)
-- ---------------------------------------------------------------------------

drop policy if exists "authenticated_read_registrations" on public.registrations;
drop policy if exists "organizer_read_registrations" on public.registrations;
create policy "organizer_read_registrations"
  on public.registrations for select
  to authenticated
  using (
    public.is_super_admin()
    or event_id in (select id from public.events where owner_id = auth.uid())
  );

drop policy if exists "authenticated_read_booked_seats" on public.booked_seats;
drop policy if exists "organizer_read_booked_seats" on public.booked_seats;
create policy "organizer_read_booked_seats"
  on public.booked_seats for select
  to authenticated
  using (
    public.is_super_admin()
    or event_id in (select id from public.events where owner_id = auth.uid())
  );

drop policy if exists "authenticated_read_payment_slips" on public.payment_slips;
drop policy if exists "organizer_read_payment_slips" on public.payment_slips;
create policy "organizer_read_payment_slips"
  on public.payment_slips for select
  to authenticated
  using (
    public.is_super_admin()
    or registration_id in (
      select r.id from public.registrations r
      join public.events e on e.id = r.event_id
      where e.owner_id = auth.uid()
    )
  );

drop policy if exists "authenticated_read_tickets" on public.tickets;
drop policy if exists "organizer_read_tickets" on public.tickets;
create policy "organizer_read_tickets"
  on public.tickets for select
  to authenticated
  using (
    public.is_super_admin()
    or registration_id in (
      select r.id from public.registrations r
      join public.events e on e.id = r.event_id
      where e.owner_id = auth.uid()
    )
  );
