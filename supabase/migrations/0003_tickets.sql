-- Attendly — Feature 3: Tickets & gate check-in
-- A ticket row is created ONLY when an organizer verifies the payment slip.
-- qr_token is the opaque value encoded in the QR code; ticket_number is the
-- human-readable fallback for manual entry at the gate.

create sequence if not exists public.ticket_number_seq start 1;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  ticket_number text not null unique
    default ('TKT-' || lpad(nextval('public.ticket_number_seq')::text, 4, '0')),
  qr_token uuid not null unique default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid -- auth.uid() of the organizer who scanned
);

create index if not exists tickets_checked_in_idx on public.tickets (checked_in_at);

alter table public.tickets enable row level security;

drop policy if exists "authenticated_read_tickets" on public.tickets;
create policy "authenticated_read_tickets"
  on public.tickets for select
  to authenticated
  using (true);
