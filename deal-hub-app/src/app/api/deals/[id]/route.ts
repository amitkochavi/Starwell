import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!deal) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Global invariant #5: expense-side normalization needs a typed override — enforced
  // in the review layer (M4.5); this route accepts headline sourced-value edits.
  if (body.status === 'Pass' && !body.passReason) {
    return NextResponse.json({ error: 'A pass reason is required to set status = Pass.' }, { status: 400 });
  }
  const deal = await prisma.deal.update({ where: { id: params.id }, data: body });
  return NextResponse.json(deal);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
