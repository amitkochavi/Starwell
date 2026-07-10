// Background worker (PRD §H): a second Node process (`npm run worker`) that polls
// the `jobs` table — no Redis needed at this user count; the queue IS the table.
// Concurrency 2, graceful retry/backoff (in processOne). A failed agent never
// blocks the others.
import { prisma } from '@/lib/prisma';
import { processOne } from '@/lib/queue';

const CONCURRENCY = 2;
const POLL_MS = 2000;
let running = 0;

async function tick() {
  if (running >= CONCURRENCY) return;
  const job = await prisma.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
  if (!job) return;
  running++;
  try { await processOne(job.id); } finally { running--; }
}

console.log(`[worker] polling jobs every ${POLL_MS}ms (concurrency ${CONCURRENCY})`);
setInterval(() => { void tick(); void tick(); }, POLL_MS);
