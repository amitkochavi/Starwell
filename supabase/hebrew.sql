-- Starwell — Hebrew (bilingual) content columns.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- The Hebrew site (/he/) reads these *_he fields and falls back to the English
-- columns when a Hebrew value is empty, so nothing ever shows blank.

alter table public.news_articles
  add column if not exists title_he    text,
  add column if not exists excerpt_he  text,
  add column if not exists category_he text;

alter table public.job_postings
  add column if not exists title_he           text,
  add column if not exists description_he     text,
  add column if not exists category_he        text,
  add column if not exists location_he        text,
  add column if not exists employment_type_he text;
