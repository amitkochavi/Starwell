// HC.5 Pro-forma deal test — used by the LBO "HoldCo test" button.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consolidate, proFormaTest, type FacilityLite, type OpCoLite } from '@/lib/holdco';
export const dynamic = 'force-dynamic';

async function loadFacs(): Promise<FacilityLite[]> {
  const facs = await prisma.holdCoFacility.findMany();
  return facs.map((f) => { let am = 0, cov: { maxLeverage: number | null; minDSCR: number | null } = { maxLeverage: null, minDSCR: null };
    try { am = JSON.parse(f.amortization || '{}').annual || 0; } catch {} try { cov = JSON.parse(f.covenants || '{}'); } catch {}
    return { drawn: f.drawn, rateBps: f.spreadBps || 0, amortAnnual: am, maxLeverage: cov.maxLeverage ?? null, minDSCR: cov.minDSCR ?? null }; });
}
async function loadOpcos(): Promise<OpCoLite[]> {
  const closed = await prisma.deal.findMany({ where: { status: 'Closed' } });
  return closed.filter((d) => d.ebitdaM != null).map((d) => ({ name: d.projectName, ebitda: d.ebitdaM as number, ownership: 1 }));
}

export async function POST(req: Request) {
  const { dealId, addDraw, rateBps } = await req.json() as { dealId: string; addDraw: number; rateBps: number };
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.ebitdaM == null) return NextResponse.json({ error: 'deal needs an approved EBITDA' }, { status: 400 });
  const [facs, opcos] = await Promise.all([loadFacs(), loadOpcos()]);
  const r = proFormaTest(facs, opcos, 5, deal.ebitdaM, addDraw || 0, rateBps || 700);
  await prisma.holdCoTest.create({ data: { dealId, inputs: JSON.stringify({ addDraw, rateBps }), verdict: r.verdict, headroom: r.pro.capacity ?? null, testedAt: new Date() } });
  return NextResponse.json(r);
}
export async function GET() {
  const [facs, opcos] = await Promise.all([loadFacs(), loadOpcos()]);
  return NextResponse.json(consolidate(facs, opcos, 5));
}
