-- Starwell Deal Hub — Module A (Deal Database) + Module B (Deal Workspace) storage.
-- Member-only (RLS via public.is_member()). Run once in the Supabase SQL editor.
-- Safe to re-run: IF NOT EXISTS / idempotent policies.

-- ---- Deals (Module A row) --------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  date_of_entry   date default current_date,
  status          text not null default 'Underwriting',   -- Underwriting/Call scheduled/IC/Approved/Pass/Hold/Lost/Closed
  deal_lead       text,
  priority        text,                                    -- High/Medium/Low
  next_steps      text,
  next_step_due   date,
  project_name    text not null,
  drive_folder_url text,
  business_profile text,
  revenue_m       numeric,      -- LTM Revenue ($M, deal currency)
  ebitda_m        numeric,      -- LTM EBITDA
  sde_m           numeric,      -- SDE (renders — where n/a)
  ev_m            numeric,      -- Enterprise Value / TEV
  valuation_basis text,         -- e.g. "LTM EBITDA" — stamped on every multiple
  deal_type       text,         -- Value/Roll-up/Growth
  industry        text default 'IT Services',
  sub_industry    text,
  currency        text default 'USD',
  score           numeric,      -- overall /5 (manual for now)
  pass_reason     text,
  key_documents   jsonb default '[]'::jsonb,   -- received-doc chips
  created_at      timestamptz not null default now(),
  created_by      text
);
alter table public.deals enable row level security;
drop policy if exists deals_member on public.deals;
create policy deals_member on public.deals for all
  using (public.is_member()) with check (public.is_member());

-- ---- Deal workspace pages (Module B — one row per page per deal) -----------
-- body = free text / markdown; data = structured JSON (financial tables,
-- scoring axes, checklist, cross-check rows, flags, economics overrides).
create table if not exists public.deal_pages (
  id uuid primary key default gen_random_uuid(),
  deal_id   uuid not null references public.deals(id) on delete cascade,
  page_key  text not null,
  body      text,
  data      jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (deal_id, page_key)
);
alter table public.deal_pages enable row level security;
drop policy if exists deal_pages_member on public.deal_pages;
create policy deal_pages_member on public.deal_pages for all
  using (public.is_member()) with check (public.is_member());

create index if not exists deal_pages_deal_idx on public.deal_pages(deal_id);

-- ---- Seed one example deal so the Hub isn't empty on first open ------------
insert into public.deals (project_name, status, deal_lead, priority, deal_type,
  industry, sub_industry, revenue_m, ebitda_m, ev_m, valuation_basis, business_profile)
select 'Example MSP — Southeast','Underwriting','Amit','Medium','Roll-up',
  'IT Services','MSP', 8.4, 1.9, 8.55, 'LTM EBITDA',
  'Managed IT services provider serving SMB clients across the US Southeast.'
where not exists (select 1 from public.deals);
