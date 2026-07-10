# Starwell Deal Hub — full app (Next.js)

The standalone application for the **Starwell Deal Hub PRD (FINAL v3)** — the MSP/IT
acquisition deal-analysis platform (Kodiak-parity). This is the real architecture the
PRD targets: **Next.js 14 (App Router) + TypeScript + Prisma + a background worker +
the Anthropic API**. It's separate from the in-HQ Deal Hub (which lives in `hq.html`
on the static site and can't run the server-side AI pipeline).

> **Status: M0 + M1 + M2.** M0/M1: Deal Database (Module A), workspace shell, full
> Prisma data model (§G), deterministic EV-bridge/LBO (`src/lib/finance.ts`).
> **M2 (the first end-to-end AI loop):** document upload (SHA-256 dedupe, 50 MB cap,
> all file types) → **Agent 0** classify + checklist → **Agent 1** extract-with-
> citations on a CIM → **Review screen** (Accept/Edit/Reject) → canonical value +
> Cross-Check row. Dataroom page (checklist + Files browser), authenticated file
> serving, "Process all documents". Memo pages/scoring/LBO UI/HoldCo/cohort come in
> M3–M9 (build order: PRD §0.4).

### The AI loop, end to end
1. Deal → **Dataroom** → *Upload documents* (a CIM PDF).
2. *Process all documents* → Agent 0 classifies it as `CIM` and marks the checklist
   `Received`; a CIM auto-chains to Agent 1, which extracts revenue/EBITDA/EV/… each
   with a `{page, snippet}` citation and writes **proposed** values (never canonical).
3. **Review** → each proposal shows its snippet + a deep-link to the cited PDF page;
   Accept writes it to the deal and adds a Cross-Check row. Reject logs it.
4. With **no `ANTHROPIC_API_KEY`**, uploads still store and the checklist still works;
   the job fails **visibly** — no fabricated output (criterion 23).

> **Storage on Vercel:** M2 stores files on local disk (`DATA_DIR`, default `./data`)
> per PRD §H — fine for local dev and a single always-on host. Vercel's serverless FS
> is ephemeral, so for a Vercel deploy swap `src/lib/storage.ts` for **Vercel Blob**
> or **S3** (same interface). The worker likewise wants an always-on host; the
> `/process` route drains the queue in-process so the loop also works without it.

## Deploy to Vercel (Postgres + Blob) — step by step

The app is **Postgres-backed** (Vercel serverless can't use SQLite files) and stores
uploads in **Vercel Blob**. `vercel.json` sets the build to
`prisma generate && prisma migrate deploy && prisma db seed && next build`, so **every
deploy auto-creates the tables and seeds the fixtures if the DB is empty** — no manual
DB commands.

1. **Import the repo** in Vercel → **New Project**. Set **Root Directory = `deal-hub-app`**.
2. **Storage → Create Database → Postgres** (or Neon). Connect it to the project — this
   sets `DATABASE_URL` (and `POSTGRES_*`) automatically. **Use `DATABASE_URL`.**
3. **Storage → Create → Blob.** Connect it — this sets `BLOB_READ_WRITE_TOKEN`
   automatically (uploads then go to Blob).
4. **Settings → Environment Variables** → add:
   - `ANTHROPIC_API_KEY` = your `sk-ant-…` key (create at console.anthropic.com; keep it secret)
   - `ANTHROPIC_MODEL` = `claude-sonnet-5`
5. **Redeploy** (Deployments → ⋯ → Redeploy). The build migrates + seeds; `/deals` now works.
6. **Worker (optional).** The `/process` route drains the queue in-request, so the AI
   loop works without a worker. If you later want continuous background processing,
   run `npm run worker` on a small always-on host (Railway/Render/Fly) pointed at the
   same `DATABASE_URL`, or a Vercel Cron that POSTs `/api/deals/*/process`.

> **Blob access:** M2 uses `access: 'public'` blobs (unguessable URLs) served through
> the app's `/api/files/*` route. For sensitive deal documents, tighten this to signed
> URLs + auth before real use — noted as an M2 follow-up.

## Run locally
Local dev also uses Postgres now (provider is `postgresql`). Easiest: a free **Neon**
DB — put its URL in `.env` as `DATABASE_URL`. Then:
```bash
cp .env.example .env          # set DATABASE_URL + ANTHROPIC_API_KEY
npm install
npm run db:push && npm run db:seed
npm run dev                   # http://localhost:3000
```

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
