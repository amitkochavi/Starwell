// Persist an LBO scenario's assumptions + computed outputs (B.17).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { name, assumptions, outputs } = await req.json() as { name: string; assumptions: unknown; outputs?: unknown };
  if (!['Base', 'Bull', 'Bear'].includes(name)) return NextResponse.json({ error: 'name must be Base/Bull/Bear' }, { status: 400 });
  await prisma.lboScenario.upsert({
    where: { dealId_name: { dealId: params.id, name } },
    update: { assumptions: JSON.stringify(assumptions), outputs: outputs ? JSON.stringify(outputs) : undefined },
    create: { dealId: params.id, name, assumptions: JSON.stringify(assumptions), outputs: outputs ? JSON.stringify(outputs) : null },
  });
  return NextResponse.json({ ok: true });
}
