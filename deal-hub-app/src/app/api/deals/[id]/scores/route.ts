// Quant/Qual scoring (B.12/B.13). Replaces the deal's entries for that kind.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { kind, entries } = await req.json() as { kind: 'quant' | 'qual'; entries: { axis: string; value: number | null; rationale?: string }[] };
  if (!['quant', 'qual'].includes(kind)) return NextResponse.json({ error: 'kind must be quant|qual' }, { status: 400 });
  await prisma.scoreEntry.deleteMany({ where: { dealId: params.id, kind } });
  await prisma.scoreEntry.createMany({ data: entries.map((e) => ({ dealId: params.id, kind, axis: e.axis, value: e.value, rationale: e.rationale || null })) });
  return NextResponse.json({ ok: true });
}
