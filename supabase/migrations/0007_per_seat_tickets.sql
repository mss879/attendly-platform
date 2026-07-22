-- Attendly — Feature 7: one ticket (and one QR) per seat
-- Previously a registration got a single ticket no matter how many seats it
-- booked, so a 5-seat booking arrived as one QR. Tickets are now per seat:
-- each seat carries its own ticket number and its own scannable QR, and the
-- gate checks in seats individually.
--
-- Also adds registrations.source so organizer-issued ("custom") tickets are
-- distinguishable from self-service bookings.
--
-- Safe to re-run: every step is guarded.

-- ---------------------------------------------------------------------------
-- 1) tickets.seat_no
-- ---------------------------------------------------------------------------

alter table public.tickets add column if not exists seat_no text;

-- ---------------------------------------------------------------------------
-- 2) Drop "one ticket per registration" BEFORE backfilling extra seats,
--    otherwise the inserts below trip the old unique constraint.
--    The name is looked up rather than assumed (0003 created it implicitly
--    via `registration_id uuid not null unique`).
-- ---------------------------------------------------------------------------

do $$
declare
  con_name text;
begin
  select c.conname into con_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'tickets'
    and c.contype = 'u'
    and c.conkey = array[(
      select a.attnum from pg_attribute a
      where a.attrelid = c.conrelid and a.attname = 'registration_id'
    )];

  if con_name is not null then
    execute format('alter table public.tickets drop constraint %I', con_name);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Backfill. An existing ticket keeps its number and check-in state and
--    adopts the first seat of its registration; the registration's remaining
--    seats each get a fresh ticket.
-- ---------------------------------------------------------------------------

update public.tickets t
set seat_no = (
  select bs.seat_no
  from public.booked_seats bs
  where bs.registration_id = t.registration_id
  order by bs.seat_no
  limit 1
)
where t.seat_no is null;

-- The sibling seats INHERIT the old ticket's check-in state. Under the old
-- one-QR-per-booking model a single scan admitted the whole party, so those
-- seats are already spent — issuing them as fresh, unscanned QRs would let a
-- party that has already walked in pull new codes from their portal page and
-- admit more people. Marking a consumed entitlement as consumed is the
-- fail-safe direction.
insert into public.tickets (registration_id, seat_no, checked_in_at, checked_in_by)
select bs.registration_id, bs.seat_no, legacy.checked_in_at, legacy.checked_in_by
from public.booked_seats bs
join (
  -- the pre-migration ticket of each already-ticketed registration
  select distinct on (registration_id)
         registration_id, checked_in_at, checked_in_by
  from public.tickets
  order by registration_id, issued_at
) legacy on legacy.registration_id = bs.registration_id
where not exists (
  select 1 from public.tickets t2
  where t2.registration_id = bs.registration_id
    and t2.seat_no = bs.seat_no
);

-- ---------------------------------------------------------------------------
-- 4) One ticket per seat of a registration.
-- ---------------------------------------------------------------------------

create unique index if not exists tickets_registration_seat_unique
  on public.tickets (registration_id, seat_no);

-- Postgres treats NULLs as distinct, so the index above would happily allow
-- many seatless tickets for one registration — each a separately valid QR.
-- This keeps the original "one ticket per registration" guarantee for the
-- seatless (pre-seating / legacy) case.
create unique index if not exists tickets_registration_seatless_unique
  on public.tickets (registration_id)
  where seat_no is null;

create index if not exists tickets_registration_idx
  on public.tickets (registration_id);

-- ---------------------------------------------------------------------------
-- 5) registrations.source — 'booking' (public wizard) | 'custom' (organizer)
-- ---------------------------------------------------------------------------

alter table public.registrations
  add column if not exists source text not null default 'booking';

alter table public.registrations
  drop constraint if exists registrations_source_check;

alter table public.registrations
  add constraint registrations_source_check
  check (source in ('booking', 'custom'));

create index if not exists registrations_source_idx
  on public.registrations (source);
