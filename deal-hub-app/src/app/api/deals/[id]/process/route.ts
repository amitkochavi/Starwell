// "Process all documents" (C.2 / criterion 34): (re)queue Agent 0 for the deal's
// documents, then drain the queue in-process (serverless has no always-on worker).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { drainJobs } from '@/lib/queue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const docs = await prisma.document.findMany({ where: { dealId: params.id } });
  for (const d of docs) {
    const pending = await prisma.job.findFirst({ where: { documentId: d.id, status: { in: ['queued', 'running', 'needs_review'] } } });
    if (!pending) await prisma.job.create({ data: { dealId: params.id, documentId: d.id, agent: 'agent0', status: 'queued' } });
  }
  const processed = await drainJobs();
  return NextResponse.json({ processed });
}
