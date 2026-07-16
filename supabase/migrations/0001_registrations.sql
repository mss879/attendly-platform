-- Attendly — Feature 1: Registrations
-- An "EX" (alumni) reserves a ticket with name, email, phone and batch.
-- payment_status lifecycle: pending -> slip_uploaded -> verified | rejected
--                           (rejected -> slip_uploaded again on re-upload)

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  batch text not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'slip_uploaded', 'verified', 'rejected')),
  -- secret token for the registrant's personal portal link (/r/[token])
  access_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists registrations_email_idx on public.registrations (lower(email));
create index if not exists registrations_phone_idx on public.registrations (phone);
create index if not exists registrations_batch_idx on public.registrations (batch);
create index if not exists registrations_status_idx on public.registrations (payment_status);

-- RLS: no public access. Organizers (authenticated) may read.
-- All writes go through the app server using the service-role key.
alter table public.registrations enable row level security;

drop policy if exists "authenticated_read_registrations" on public.registrations;
create policy "authenticated_read_registrations"
  on public.registrations for select
  to authenticated
  using (true);
