-- Starwell Portal: tables the Dashboard reads.
--
-- benchmarks        monthly index levels, written only by the scheduled
--                   Edge Function running under the service role
-- portal_snapshots  a frozen quarter, written by a signed-in member
--
-- Both are readable only by a signed-in address on the members allowlist,
-- which is the same gate the rest of Starwell HQ uses.

create table if not exists public.benchmarks (
  benchmark           text        not null,
  month               date        not null,
  total_return_index  numeric     not null,
  symbol              text,
  provider            text,
  updated_at          timestamptz not null default now(),
  primary key (benchmark, month)
);

create index if not exists benchmarks_month_idx on public.benchmarks (month);

create table if not exists public.portal_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  quarter       text        not null unique,     -- '2026Q3'
  as_of         date        not null,            -- the reporting date frozen
  payload       jsonb       not null,            -- the figures as computed
  frozen_by     text        not null,
  frozen_at     timestamptz not null default now()
);

create index if not exists portal_snapshots_as_of_idx on public.portal_snapshots (as_of desc);

alter table public.benchmarks       enable row level security;
alter table public.portal_snapshots enable row level security;

-- A member is an address on the existing allowlist.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists benchmarks_read on public.benchmarks;
create policy benchmarks_read on public.benchmarks
  for select to authenticated using (public.is_member());

-- No insert/update/delete policy: only the service role, which bypasses RLS,
-- writes benchmark levels. That is the scheduled Edge Function.

drop policy if exists snapshots_read on public.portal_snapshots;
create policy snapshots_read on public.portal_snapshots
  for select to authenticated using (public.is_member());

drop policy if exists snapshots_insert on public.portal_snapshots;
create policy snapshots_insert on public.portal_snapshots
  for insert to authenticated with check (
    public.is_member() and frozen_by = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- A frozen quarter is a record. It is never edited or deleted from the page.
