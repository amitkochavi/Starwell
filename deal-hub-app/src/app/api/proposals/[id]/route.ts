// Human-in-the-loop review (C.4). Accept -> value becomes canonical on the Deal
// with provenance, and a Cross-Check row is created (criterion 14). Reject ->
// logged, canonical untouched (criterion 15). Nothing here is automatic.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CIM_FIELDS } from '@/lib/extract-schema';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { action, value, reviewedBy } = await req.json() as { action: 'accept' | 'reject'; value?: unknown; reviewedBy?: string };
  const pv = await prisma.proposedValue.findUnique({ where: { id: params.id } });
  if (!pv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (action === 'reject') {
    await prisma.proposedValue.update({ where: { id: pv.id }, data: { status: 'rejected', reviewedBy: reviewedBy || null, reviewedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  const field = CIM_FIELDS[pv.field];
  if (!field) return NextResponse.json({ error: `unknown field ${pv.field}` }, { status: 400 });
  const finalValue = value !== undefined ? value : (pv.value == null ? null : JSON.parse(pv.value));

  await prisma.deal.update({ where: { id: pv.dealId }, data: { [field.column]: finalValue } });
  await prisma.proposedValue.update({ where: { id: pv.id }, data: { status: 'accepted', value: finalValue == null ? null : JSON.stringify(finalValue), reviewedBy: reviewedBy || null, reviewedAt: new Date() } });
  await prisma.crossCheckEntry.create({
    data: { dealId: pv.dealId, figure: field.label, appearsAt: 'Executive Summary / top bar', method: 'Extracted', source: pv.citationLocator, status: 'Consistent', detail: pv.snippet || undefined },
  });
  return NextResponse.json({ ok: true });
}
