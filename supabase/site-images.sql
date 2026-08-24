-- Make every site image manageable from the HQ dashboard.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
--   site_images : fixed image slots on the site (portraits, etc.), by key
--   partners    : the partner logo carousel
--
-- Both are public-read / member-write, like the other content tables, and are
-- filled by uploading files in HQ (bucket "portfolio", see portfolio-images.sql).

create table if not exists public.site_images (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,   -- slot id used by the site (do not rename)
  label      text not null,          -- shown in the HQ list
  url        text,                   -- uploaded image
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  active     boolean not null default true,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- Row-level security: anyone may read, only signed-in members may write.
alter table public.site_images enable row level security;
alter table public.partners    enable row level security;
do $$
declare t text;
begin
  foreach t in array array['site_images','partners'] loop
    execute format('drop policy if exists %I on public.%I', t||'_read',  t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for select using (true)', t||'_read', t);
    execute format('create policy %I on public.%I for all using (public.is_member()) with check (public.is_member())', t||'_write', t);
  end loop;
end $$;

-- Image slots the site looks for (upload a file to each in HQ).
insert into public.site_images (key,label,sort_order) values
  ('amit-kochavi',   'Our Team - Amit Kochavi portrait',    1),
  ('shirly-gur-arie','Our Team - Shirly Gur Arie portrait', 2),
  ('max-factor',     'Our History - Max Factor portrait',   3),
  ('david-heyman',   'Our History - David M. Heyman portrait', 4),
  ('doron-kochavi',  'Our History - Doron Kochavi portrait', 5)
on conflict (key) do nothing;

-- Partner carousel (upload each logo in HQ; Kodiak already has a live logo).
insert into public.partners (name,logo_url,sort_order) values
  ('Tidhar',          null, 1),
  ('Union Group',     null, 2),
  ('Kodiak Holdings','https://cdn.prod.website-files.com/680f8b21602c5a1d5a2cea69/6810df55a602d0dfff94ca80_logo.svg', 3),
  ('Center Capital',  null, 4),
  ('Legion Holdings', null, 5),
  ('Wilpon & Co.',    null, 6),
  ('Noked Capital',   null, 7),
  ('Hazavim',         null, 8)
on conflict do nothing;
