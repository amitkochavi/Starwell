// Economics at a Glance (B.1) — deterministic, computed from CANONICAL (approved)
// values only. A computed metric with an incomplete input refuses to render and
// names the missing input (Global invariant #1). This is the shape Agent 2
// (deterministic recompute) and the Executive Summary both read.
import { entryMultiple, marginPct, cagrPct } from './finance';

export interface YearRow { y?: string; rev?: string; ebitda?: string; margin?: string; capex?: string }
export function num(s?: string | number | null): number | null {
  if (s == null || s === '') return null;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

export interface DealEcon { evM: number | null; ebitdaM: number | null; revenueM: number | null; valuationBasis: string | null }

export interface Economics {
  entryMultiple: number | null; entryMissing?: string; basisNote: string;
  margin: number | null; revCagr3: number | null; ebitdaCagr3: number | null;
}

export function economics(deal: DealEcon, years: YearRow[] = []): Economics {
  const em = entryMultiple(deal.evM, deal.ebitdaM);
  const revs = years.map((r) => num(r.rev));
  const ebts = years.map((r) => num(r.ebitda));
  return {
    entryMultiple: em.value, entryMissing: em.missing, basisNote: em.basisNote,
    margin: marginPct(deal.ebitdaM, deal.revenueM),
    revCagr3: cagrPct(revs.slice(-4)), ebitdaCagr3: cagrPct(ebts.slice(-4)),
  };
}
