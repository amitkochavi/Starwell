-- Portfolio photo galleries + a Supabase Storage bucket for uploads.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- After this, the HQ dashboard can upload photos/logos; one image shows
-- statically, several show as a slider on the site.

-- 1) images gallery column (array of public URLs)
alter table public.portfolio_companies
  add column if not exists images jsonb not null default '[]'::jsonb;

-- 2) public storage bucket for portfolio media
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- 3) storage policies: anyone can read; signed-in members can write
drop policy if exists "portfolio read"   on storage.objects;
drop policy if exists "portfolio write"  on storage.objects;
drop policy if exists "portfolio update" on storage.objects;
drop policy if exists "portfolio delete" on storage.objects;
create policy "portfolio read"   on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio write"  on storage.objects for insert with check (bucket_id = 'portfolio' and public.is_member());
create policy "portfolio update" on storage.objects for update using (bucket_id = 'portfolio' and public.is_member());
create policy "portfolio delete" on storage.objects for delete using (bucket_id = 'portfolio' and public.is_member());

-- 4) backfill the existing real-estate photos into the gallery
update public.portfolio_companies set images = jsonb_build_array('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/c758ca080_--beyond---2.jpg')
  where name = 'Beyond Towers' and images = '[]'::jsonb;
update public.portfolio_companies set images = jsonb_build_array('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/3d8bac403_Screenshot2025-09-17at084300.png')
  where name = 'The Dawson' and images = '[]'::jsonb;
update public.portfolio_companies set images = jsonb_build_array('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/a895ebd2e_Screenshot2025-12-19at215702.png')
  where name = 'Terminal Logistics Fund II' and images = '[]'::jsonb;
