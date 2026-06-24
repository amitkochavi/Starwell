-- ============================================================
-- Starwell HQ — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Security model:
--   * Anyone may READ content (news / jobs / portfolio) so the public
--     website can render it.
--   * Only e-mails listed in `members` may WRITE (insert/update/delete).
--   * Login is Supabase email-OTP; a successful login that is NOT in
--     `members` can read public content but cannot edit anything, and the
--     HQ dashboard signs them straight back out.
-- ============================================================

-- 1) Allowlist of people who may sign in to HQ and edit content.
create table if not exists public.members (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;

-- A signed-in user may read ONLY their own membership row (used by the
-- dashboard to confirm "am I allowed in?").
drop policy if exists members_self_read on public.members;
create policy members_self_read on public.members
  for select using (auth.jwt() ->> 'email' = email);

-- Helper: is the current user an allowlisted member?
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.email = (auth.jwt() ->> 'email')
  );
$$;

-- 2) Content tables -------------------------------------------------------
create table if not exists public.news_articles (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  category           text,
  excerpt            text,
  content            text,
  author             text,
  publish_date       date,
  source_url         text,
  featured_image_url text,
  featured           boolean not null default false,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now()
);

create table if not exists public.job_postings (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text,
  location        text,
  employment_type text,
  description     text,
  apply_url       text,
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.portfolio_companies (
  id          uuid primary key default gen_random_uuid(),
  pillar      text not null,            -- technology | real-estate | capital
  name        text not null,
  role        text,
  description text,
  website_url text,
  logo_url    text,
  partner     text,
  location    text,
  image_label text,
  highlight   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- 3) Row-level security: public read, member-only write -------------------
do $$
declare t text;
begin
  foreach t in array array['news_articles','job_postings','portfolio_companies'] loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t||'_public_read', t);
    execute format(
      'create policy %I on public.%I for select using (true);',
      t||'_public_read', t);

    execute format('drop policy if exists %I on public.%I;', t||'_member_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_member()) with check (public.is_member());',
      t||'_member_write', t);
  end loop;
end $$;

-- 4) Add yourself as a member (CHANGE THE EMAIL) --------------------------
insert into public.members (email, name)
values ('amit@kochavii.com', 'Amit Kochavi')
on conflict (email) do nothing;
