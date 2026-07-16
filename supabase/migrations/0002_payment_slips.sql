-- Attendly — Feature 2: Payment slips
-- Registrants upload proof of bank-transfer payment. Multiple uploads are
-- allowed (e.g. re-upload after a rejection); the newest one is reviewed.

create table if not exists public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists payment_slips_registration_idx
  on public.payment_slips (registration_id);

alter table public.payment_slips enable row level security;

drop policy if exists "authenticated_read_payment_slips" on public.payment_slips;
create policy "authenticated_read_payment_slips"
  on public.payment_slips for select
  to authenticated
  using (true);

-- Private storage bucket for the slip files. Uploads and signed-URL viewing
-- are proxied through the app server (service role), so no public policies.
insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_read_payment_slip_files" on storage.objects;
create policy "authenticated_read_payment_slip_files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-slips');
