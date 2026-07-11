// Job processing shared by the long-running worker and the inline drain used by
// the /process route (Vercel serverless has no always-on worker). Nothing
// auto-commits: a successful agent run leaves the job at needs_review (C.4).
import { prisma } from './prisma';
import { runAgent0 } from '@/agents/agent0';
import { runAgent1 } from '@/agents/agent1';
import { runAgentTax } from '@/agents/agentTax';

export async function processOne(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'queued') return;
  await prisma.job.update({ where: { id: jobId }, data: { status: 'running', attempts: { increment: 1 } } });
  try {
    if (job.agent === 'agent0') await runAgent0(jobId);
    else if (job.agent === 'agent1') await runAgent1(jobId);
    else if (job.agent === 'tax') await runAgentTax(jobId);
    else throw new Error(`Unknown agent: ${job.agent}`);
    await prisma.job.update({ where: { id: jobId }, data: { status: 'needs_review', error: null } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const failed = job.attempts >= 2;
    await prisma.job.update({ where: { id: jobId }, data: { status: failed ? 'failed' : 'queued', error: message } });
  }
}

/** Drain the queue in-process (used by the /process route). */
export async function drainJobs(max = 20): Promise<number> {
  let done = 0;
  for (let i = 0; i < max; i++) {
    const next = await prisma.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
    if (!next) break;
    await processOne(next.id);
    done++;
  }
  return done;
}
