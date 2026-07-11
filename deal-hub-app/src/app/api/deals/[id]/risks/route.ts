// Risks & Mitigants register (B.7). RiskItem severities roll up to the Exec
// Summary Flag Tally.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json() as { severity: string; risk: string; mitigant?: string; owner?: string; status?: string };
  if (!b.risk || !['Red', 'Yellow', 'Green'].includes(b.severity)) return NextResponse.json({ error: 'severity (Red/Yellow/Green) + risk required' }, { status: 400 });
  const r = await prisma.riskItem.create({ data: { dealId: params.id, severity: b.severity, risk: b.risk, mitigant: b.mitigant || null, owner: b.owner || null, status: b.status || 'Open' } });
  return NextResponse.json(r, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const rid = new URL(req.url).searchParams.get('rid');
  if (!rid) return NextResponse.json({ error: 'rid required' }, { status: 400 });
  await prisma.riskItem.delete({ where: { id: rid } });
  return NextResponse.json({ ok: true });
}
