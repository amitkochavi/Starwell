// Deterministic finance helpers. NO LLM in the loop (PRD Global invariant #2/#3,
// Module B.17: "All modeling math is deterministic TypeScript").

/** A missing value renders "—", never 0 (Global invariant #1). */
export function dash(v: number | null | undefined, fmt: (n: number) => string): string {
  return v == null || Number.isNaN(v) ? '—' : fmt(v);
}
export const money = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
export const mult = (n: number) => n.toFixed(2) + '×';
export const pct = (n: number) => n.toFixed(1) + '%';

/** EBITDA margin (%). Missing/zero-revenue -> null (renders "—", invariant #1). */
export function marginPct(ebitdaM: number | null | undefined, revenueM: number | null | undefined): number | null {
  if (ebitdaM == null || revenueM == null || revenueM === 0) return null;
  return (ebitdaM / revenueM) * 100;
}

/** CAGR (%) across a series; needs >=2 positive-start points, else null. */
export function cagrPct(series: (number | null)[]): number | null {
  const v = series.filter((x): x is number => x != null && !Number.isNaN(x));
  if (v.length < 2 || v[0] <= 0) return null;
  return (Math.pow(v[v.length - 1] / v[0], 1 / (v.length - 1)) - 1) * 100;
}

/**
 * EV bridge / Entry Multiple (PRD §R.2, Global invariant #3).
 * Entry Multiple is ALWAYS EV ÷ basis EBITDA. Consideration ÷ EBITDA is a
 * different, separately-labeled metric — never constructible here.
 * Returns null (renders "—") when EV or basis EBITDA is missing, and names
 * the missing input for the caller.
 */
export function entryMultiple(evM: number | null | undefined, basisEbitdaM: number | null | undefined):
  { value: number | null; missing?: string; basisNote: string } {
  if (evM == null) return { value: null, missing: 'enterprise value', basisNote: '' };
  if (basisEbitdaM == null) return { value: null, missing: 'basis EBITDA', basisNote: '' };
  if (basisEbitdaM === 0) return { value: null, missing: 'non-zero basis EBITDA', basisNote: '' };
  return { value: evM / basisEbitdaM, basisNote: `EV ${money(evM)} ÷ EBITDA ${money(basisEbitdaM)}` };
}

export interface LboAssumptions {
  ebitda: number; entryX: number; exitX: number; lev: number;
  growth: number; yrs: number; rate: number; tax: number; capex: number;
}
export interface LboOutput {
  ev: number; debt: number; equity: number; exitEv: number; exitEquity: number;
  moic: number; irr: number | null; series: { y: number; ebitda: number; fcf: number; debt: number; cash: number }[];
}

/** Deterministic cash-sweep LBO (PRD B.17). Refuses (null) on invalid inputs. */
export function lbo(a: LboAssumptions): LboOutput | null {
  let e = a.ebitda;
  const yrs = Math.max(1, Math.min(10, a.yrs || 5));
  if (!(e > 0) || !(a.entryX > 0)) return null;
  const ev = a.entryX * e;
  const debt0 = a.lev * e;
  const equity = ev - debt0;
  if (equity <= 0) return null; // leverage above entry multiple -> unconstructible
  let D = debt0, cash = 0;
  const series: LboOutput['series'] = [];
  const g = a.growth / 100, rate = a.rate / 100, tax = a.tax / 100, capexPct = a.capex / 100;
  for (let y = 1; y <= yrs; y++) {
    e = e * (1 + g);
    const interest = rate * D;
    const taxes = Math.max(0, (e - interest) * tax);
    const capex = capexPct * e;
    const fcf = e - interest - taxes - capex;
    const pay = Math.min(Math.max(fcf, 0), D);
    D -= pay; cash += Math.max(fcf - pay, 0);
    series.push({ y, ebitda: e, fcf, debt: D, cash });
  }
  const exitEv = a.exitX * e;
  const exitEquity = exitEv - D + cash;
  const moic = exitEquity / equity;
  const irr = moic > 0 ? Math.pow(moic, 1 / yrs) - 1 : null;
  return { ev, debt: debt0, equity, exitEv, exitEquity, moic, irr, series };
}
