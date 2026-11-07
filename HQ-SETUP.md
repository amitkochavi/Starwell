# Starwell HQ — setup

`hq.html` is a private, OTP-secured dashboard where you can:

- **Investments** — your Wealth Portal (charts from the Google Sheet), embedded as the first tab.
- **News / Careers / Portfolio** — add, edit, and delete the content that appears on the public website.

Login is a real one-time code by email (Supabase Auth). Only e-mails on an
allowlist can sign in and edit. The public site can *read* content but never write it.

> Security note: `hq.html` and `wealth-portal.html` are `noindex` and blocked in
> `robots.txt`. That hides them from search — the actual protection is the OTP
> login plus Row-Level Security, so even someone who finds the URL can't read or
> change anything without a valid, allowlisted login.

---

## 1. Create a Supabase project (free)

1. Go to https://supabase.com → **New project**. Pick a name and a strong DB password.
2. When it finishes, open **SQL Editor → New query**.

## 2. Create the tables + security

1. Open `supabase/schema.sql` from this repo. **Change the email** at the bottom
   (`insert into public.members …`) to the address that should have access. Add
   more `insert` lines for additional people.
2. Paste the whole file into the SQL Editor and **Run**.
3. (Recommended) Paste `supabase/seed.sql` and **Run** — this loads your current
   portfolio and news so the dashboard and live site start with today's content.

## 3. Turn on email OTP

1. **Authentication → Providers → Email**: make sure Email is enabled.
2. **Authentication → Email Templates → Magic Link**: ensure the template
   contains the code token `{{ .Token }}` (Supabase's default includes it). That
   6-digit code is what you type into HQ. (You can keep the link too.)
3. For production volume, set up SMTP under **Project Settings → Auth → SMTP**.
   The built-in email is fine for a few logins while testing.

## 4. Add your keys

**Project Settings → API** → copy the **Project URL** and the **anon public** key
(the anon key is safe to expose; your data is protected by Row-Level Security).

- **Dashboard:** open `hq.html`, edit the `STARWELL_CONFIG` block near the top:
  ```js
  window.STARWELL_CONFIG = {
    SUPABASE_URL: "https://YOURPROJECT.supabase.co",
    SUPABASE_ANON_KEY: "eyJ...your-anon-key..."
  };
  ```
- **Public site (so your edits show on news/careers):** set the same two values
  as environment variables before building, then rebuild:
  ```bash
  export STARWELL_SB_URL="https://YOURPROJECT.supabase.co"
  export STARWELL_SB_ANON="eyJ...your-anon-key..."
  python3 build.py
  ```
  (Or just send me the two values and I'll wire them in and rebuild for you.)

## 5. Use it

1. Deploy as usual (Netlify/Vercel — same static folder).
2. Visit `/hq.html`, enter your email, get the 6-digit code, sign in.
3. Edit News / Careers / Portfolio. Changes save to Supabase and appear on the
   live site (news + careers fetch live; if Supabase is empty or unreachable,
   the site falls back to the built-in content).

## Dashboard (Starwell Portal)

The Dashboard reads Main DB, your published Google Sheet, and computes every
figure on the page from it at the moment it is drawn. Nothing is written back,
and no figure is typed into the code. To point it at a different workbook,
edit `mainDbPubUrl` at the top of `assets/hq-settings.js`.

Where Main DB does not carry something, the page says **Not in Main DB** and
raises a data check rather than falling back to a number. Two sheets it will
use as soon as they exist:

**`Liabilities`** — columns `AccountID, Date, Balance, Currency, FXRateToUSD,
Rate, Notes`, one row per loan per statement date. Without it no loan is
deducted anywhere, including from capital and allocation. Put `already net of
it` in Notes when the account's statement value is reported after the loan, so
it is not deducted twice.

**`Commitment`** — a column on the Investment Ledger holding each fund's total
commitment. The unfunded balance follows from `Amount Invested`.

A `Benchmarks` sheet (`Month, Benchmark, TotalReturnIndex`) overrides the
market data below, if you ever want to supply your own index levels.

### Where the index levels come from

`assets/benchmarks.json` holds monthly total return levels for the benchmark
proxies. It is refreshed by `.github/workflows/benchmarks.yml`, which runs
after the US close on weekdays, calls `tools/fetch_benchmarks.py`, and commits
the file when something changed. The page reads that file from its own origin,
so the browser never calls a market data provider and no key is involved.

To refresh it by hand: GitHub → Actions → *Refresh benchmark levels* → Run
workflow, or locally `python3 tools/fetch_benchmarks.py` and commit the result.

A series that fails to fetch keeps the levels it had rather than disappearing,
and the run is marked failed so you know to look.

There is also a Supabase Edge Function in `supabase/functions/benchmarks` that
does the same job into a database table, for a deployment that would rather
keep the levels there. It is not needed when the committed file is in use.

## Notes / limits

- **Portfolio** edits live in Supabase and the dashboard reads them, but the
  public pillar pages (Technology / Real Estate / Capital) are still generated
  from `data/portfolio.json` by `build.py`. Tell me if you also want those pages
  to read Portfolio live from Supabase like News and Careers do.
- Add/remove people who can log in by editing the `members` table (Supabase →
  Table editor → members), or re-running the `insert` from `schema.sql`.
