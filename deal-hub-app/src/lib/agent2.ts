// Agent 2 — Calculations (PRD Module C.3). DETERMINISTIC TypeScript, not an LLM.
// Recomputes derived metrics from *approved* values only and refreshes the
// Cross-Check Register. Runs after any Accept in the review screen (C.4:
// "Agent 2 recomputes downstream metrics and memo pages regenerate").
import { prisma } from './prisma';
import { entryMultiple, marginPct } from './finance';
import { economics, type YearRow } from './economics';

async function upsertCC(dealId: string, figure: string, method: string, source: string | null, status: string, detail: string) {
  const existing = await prisma.crossCheckEntry.findFirst({ where: { dealId, figure, method } });
  if (existing) await prisma.crossCheckEntry.update({ where: { id: existing.id }, data: { source, status, detail } });
  else await prisma.crossCheckEntry.create({ data: { dealId, figure, appearsAt: 'Executive Summary / top bar', method, source, status, detail } });
}

export async function recompute(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return;

  // financials year table (if the analyst has entered one) feeds CAGRs
  const finSec = await prisma.memoSection.findFirst({ where: { dealId, page: 'financials' } });
  let years: YearRow[] = [];
  try { years = finSec?.data ? (JSON.parse(finSec.data).years || []) : []; } catch { years = []; }

  const em = entryMultiple(deal.evM, deal.ebitdaM);
  const margin = marginPct(deal.ebitdaM, deal.revenueM);
  const econ = economics(deal, years);

  // Entry Multiple — the invariant metric (EV ÷ basis EBITDA).
  if (em.value != null) await upsertCC(dealId, 'Entry Multiple', 'Calculated', em.basisNote, 'Consistent', `EV ÷ ${deal.valuationBasis || 'EBITDA'} = ${em.value.toFixed(2)}×`);
  else await upsertCC(dealId, 'Entry Multiple', 'Calculated', null, 'Unverified', `Refuses to render — needs ${em.missing}.`);

  if (margin != null) await upsertCC(dealId, 'EBITDA margin', 'Calculated', 'EBITDA ÷ Revenue', 'Consistent', `${margin.toFixed(1)}%`);
  if (econ.revCagr3 != null) await upsertCC(dealId, 'Revenue CAGR 3Y', 'Calculated', 'Financials year table', 'Consistent', `${econ.revCagr3.toFixed(1)}%`);
  if (econ.ebitdaCagr3 != null) await upsertCC(dealId, 'EBITDA CAGR 3Y', 'Calculated', 'Financials year table', 'Consistent', `${econ.ebitdaCagr3.toFixed(1)}%`);

  // Cross-source check: if the financials year table's latest EBITDA disagrees
  // with the approved CIM EBITDA by >5%, flag a Discrepancy (B.23 / criterion 16).
  const latestEbitda = years.map((r) => r.ebitda).map((v) => (v ? Number(String(v).replace(/[^0-9.\-]/g, '')) : null)).filter((v): v is number => v != null).slice(-1)[0];
  if (latestEbitda != null && deal.ebitdaM != null && deal.ebitdaM !== 0) {
    const diff = Math.abs(latestEbitda - deal.ebitdaM) / Math.abs(deal.ebitdaM);
    if (diff > 0.05) await upsertCC(dealId, 'EBITDA (CIM vs Financials)', 'Calculated', 'CIM vs Financials year table', 'Discrepancy', `CIM ${deal.ebitdaM} vs Financials-derived ${latestEbitda} (${(diff * 100).toFixed(0)}% apart)`);
  }
}
