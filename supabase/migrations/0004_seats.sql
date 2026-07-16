-- Attendly — Feature 4: Grandstand seat bookings
-- Each registration books one or more numbered grandstand seats (rows A–F,
-- seats 01–75). The UNIQUE constraint on seat_no makes double-booking
-- impossible even under concurrent requests: the second insert simply fails.
-- Seats are freed automatically if the registration is deleted (cascade).

create table if not exists public.booked_seats (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  seat_no text not null unique
    check (seat_no ~ '^[A-F](0[1-9]|[1-6][0-9]|7[0-5])$'),
  created_at timestamptz not null default now()
);

create index if not exists booked_seats_registration_idx
  on public.booked_seats (registration_id);

alter table public.booked_seats enable row level security;

drop policy if exists "authenticated_read_booked_seats" on public.booked_seats;
create policy "authenticated_read_booked_seats"
  on public.booked_seats for select
  to authenticated
  using (true);
