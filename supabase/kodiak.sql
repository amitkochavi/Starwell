-- Add Kodiak Holdings to the Capital portfolio.
-- Run once in the Supabase SQL editor (safe to re-run: it won't duplicate).
-- After this, Kodiak appears under HQ Dashboard -> Portfolio, fully editable.
insert into public.portfolio_companies
  (pillar,name,role,description,website_url,logo_url,partner,location,image_label,highlight,sort_order)
select 'capital','Kodiak Holdings','Investor',
  'A long-term partner for aspiring small business owners, backing the next generation of American owner-operators with equity financing and support across due diligence, transaction structuring, capital raising, and ongoing operations.',
  'https://kodiakholdings.com/',
  'https://cdn.prod.website-files.com/680f8b21602c5a1d5a2cea69/6810df55a602d0dfff94ca80_logo.svg',
  null,null,'Capital',false,2
where not exists (select 1 from public.portfolio_companies where name = 'Kodiak Holdings');
