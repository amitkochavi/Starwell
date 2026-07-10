# Starwell Deal Hub — full app (Next.js)

The standalone application for the **Starwell Deal Hub PRD (FINAL v3)** — the MSP/IT
acquisition deal-analysis platform (Kodiak-parity). This is the real architecture the
PRD targets: **Next.js 14 (App Router) + TypeScript + Prisma + a background worker +
the Anthropic API**. It's separate from the in-HQ Deal Hub (which lives in `hq.html`
on the static site and can't run the server-side AI pipeline).

> **Status: M0 + M1 scaffold.** Deal Database (Module A), the deal-workspace shell,
> the full Prisma data model (§G), the deterministic EV-bridge / entry-multiple and
> LBO engine (`src/lib/finance.ts`), and the AI-pipeline plumbing (job queue worker +
> Agent 0/1 stubs + versioned prompts). The document pipeline, memo pages, scoring,
> LBO UI, HoldCo, cohort, and comparison come in M2–M9 (see the build order in the PRD §0.4).

## Run locally

```bash
cd deal-hub-app
cp .env.example .env         # set ANTHROPIC_API_KEY (server-side only)
npm install
npm run db:push              # create the SQLite schema (dev.db)
npm run db:seed              # seed users + RVM / Net Core / Example fixtures
npm run dev                  # http://localhost:3000  -> /deals
# in a second terminal, once the pipeline lands:
npm run worker
```

## Deploy to Vercel

1. Push this repo; in Vercel **New Project → import**, set **Root Directory = `deal-hub-app`**.
2. Env vars: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and `DATABASE_URL`.
   - For production use **Postgres** (Vercel Postgres / Neon / Supabase): change
     `datasource.provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`
     and point `DATABASE_URL` at it. The schema is already Postgres-compatible.
3. Build command `npm run build` (runs `prisma generate` first). Add a Postgres
   `prisma migrate deploy` step or run `db:push` once against the prod DB.
4. The **worker** (`npm run worker`) is a long-running process — run it on a small
   always-on host (Railway/Render/Fly) or a Vercel Cron that drains the queue.
   Vercel serverless functions are stateless, so the poller doesn't belong in a route.

## Layout

```
src/lib/        prisma client · anthropic client (key server-side only) · finance (EV bridge, LBO)
src/app/deals   Module A table + [id] workspace shell
src/app/api     deals REST (list/create/patch/delete)
src/worker      job-queue poller (concurrency 2, retry/backoff)
src/agents      Agent 0 (classifier) · Agent 1 (extraction) — stubs to build in M2
prompts/        versioned agent prompts (code-reviewed, §H)
prisma/         schema (full §G data model) · seed (fixtures §0.6)
```

## Invariants already enforced in code
- Missing renders `—`, never 0 (`finance.dash`).
- **Entry Multiple is always EV ÷ basis EBITDA** and refuses to render (naming the
  missing input) otherwise (`finance.entryMultiple`) — a single 3.3× division in the
  entry-multiple slot is unconstructible.
- LBO refuses on invalid inputs (leverage above entry multiple → null).
- Anthropic key is server-side only; with it removed, uploads still store and the
  pipeline fails **visibly** — no fabricated output (criterion 23).
- Extraction writes **proposed** values; nothing auto-commits (worker sets
  `needs_review`, never `done`).
