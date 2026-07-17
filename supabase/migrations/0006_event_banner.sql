-- Attendly — Feature: Event Banner Image
-- Add banner_url column to allow custom headers/banners on event pages.

-- 1) Add banner_url to the public.events table
alter table public.events
  add column if not exists banner_url text;

-- 2) Create a public storage bucket for event banners
insert into storage.buckets (id, name, public)
values ('event-banners', 'event-banners', true)
on conflict (id) do nothing;

-- 3) Enable public read access on event banners
drop policy if exists "public_read_event_banners" on storage.objects;
create policy "public_read_event_banners"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-banners');

-- 4) Seed the Bradby event banner
update public.events
set banner_url = '/banner.webp'
where slug = 'bradby-shield-2026';
