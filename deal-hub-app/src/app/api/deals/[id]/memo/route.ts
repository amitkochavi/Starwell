// Save a memo section (B.1/B.2 analyst edits). Upsert on (dealId, page, v1).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recompute } from '@/lib/agent2';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { page, body, data } = await req.json() as { page: string; body?: string; data?: unknown };
  const dataStr = data !== undefined ? JSON.stringify(data) : undefined;
  await prisma.memoSection.upsert({
    where: { dealId_page_version: { dealId: params.id, page, version: 1 } },
    update: { body, data: dataStr, generatedAt: new Date() },
    create: { dealId: params.id, page, version: 1, body: body || null, data: dataStr || null },
  });
  // Financials edits change CAGRs / cross-source checks -> recompute.
  if (page === 'financials') await recompute(params.id);
  return NextResponse.json({ ok: true });
}
