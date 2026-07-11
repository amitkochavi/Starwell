import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const b = await req.json() as { lender: string; commitment: number; drawn: number; rateBps: number; amortAnnual: number; maxLeverage?: number; minDSCR?: number };
  if (!b.lender) return NextResponse.json({ error: 'lender required' }, { status: 400 });
  const f = await prisma.holdCoFacility.create({ data: {
    lender: b.lender, commitment: b.commitment || 0, drawn: b.drawn || 0, rateType: 'floating',
    spreadBps: Math.round(b.rateBps || 0), amortization: JSON.stringify({ annual: b.amortAnnual || 0 }),
    covenants: JSON.stringify({ maxLeverage: b.maxLeverage ?? null, minDSCR: b.minDSCR ?? null }),
  } });
  return NextResponse.json(f, { status: 201 });
}
