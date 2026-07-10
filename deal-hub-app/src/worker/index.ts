// Background worker (PRD §H): a second Node process (`npm run worker`) that polls
// the `jobs` table — no Redis needed at this user count; the queue IS the table.
// Concurrency 2, graceful retry/backoff. A failed agent never blocks the others.
import { prisma } from '@/lib/prisma';
import { runAgent0 } from '@/agents/agent0';
import { runAgent1 } from '@/agents/agent1';

const CONCURRENCY = 2;
const POLL_MS = 2000;
let running = 0;

async function tick() {
  if (running >= CONCURRENCY) return;
  const job = await prisma.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
  if (!job) return;
  running++;
  await prisma.job.update({ where: { id: job.id }, data: { status: 'running', attempts: { increment: 1 } } });
  try {
    switch (job.agent) {
      case 'agent0': await runAgent0(job.id); break;
      case 'agent1': await runAgent1(job.id); break;
      default: throw new Error(`Unknown agent: ${job.agent}`);
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: 'needs_review' } }); // C.4: nothing auto-commits
  } catch (err: any) {
    const failed = job.attempts >= 2;
    await prisma.job.update({
      where: { id: job.id },
      data: { status: failed ? 'failed' : 'queued', error: String(err?.message || err) },
    });
  } finally {
    running--;
  }
}

console.log(`[worker] polling jobs every ${POLL_MS}ms (concurrency ${CONCURRENCY})`);
setInterval(() => { void tick(); void tick(); }, POLL_MS);
