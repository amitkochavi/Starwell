// Module HC — HoldCo consolidated model. DETERMINISTIC TypeScript. Debt is raised
// at the HoldCo and serviced by aggregate OpCo cash flow; a missing input renders
// "—" and disables the affected output (core principle).

export interface FacilityLite { drawn: number; rateBps: number; amortAnnual: number; maxLeverage: number | null; minDSCR: number | null }
export interface OpCoLite { name: string; ebitda: number; ownership: number } // ownership 0..1

export interface Consolidation {
  ebitda: number; netDebt: number; interest: number; amort: number; debtService: number; capex: number;
  leverage: number | null; dscr: number | null; covMaxLev: number | null; covMinDSCR: number | null; capacity: number | null;
}

export function consolidate(facs: FacilityLite[], opcos: OpCoLite[], capexPct: number, rateBumpBps = 0, ebitdaScale = 1): Consolidation {
  const ebitda = opcos.reduce((s, o) => s + o.ebitda * o.ownership, 0) * ebitdaScale;
  const netDebt = facs.reduce((s, f) => s + f.drawn, 0);
  const interest = facs.reduce((s, f) => s + f.drawn * (f.rateBps + rateBumpBps) / 10000, 0);
  const amort = facs.reduce((s, f) => s + (f.amortAnnual || 0), 0);
  const debtService = interest + amort;
  const capex = ebitda * (capexPct / 100);
  const maxLevs = facs.map((f) => f.maxLeverage).filter((x): x is number => x != null);
  const minDs = facs.map((f) => f.minDSCR).filter((x): x is number => x != null);
  const covMaxLev = maxLevs.length ? Math.min(...maxLevs) : null;
  const covMinDSCR = minDs.length ? Math.max(...minDs) : null;
  return {
    ebitda, netDebt, interest, amort, debtService, capex,
    leverage: ebitda > 0 ? netDebt / ebitda : null,
    dscr: debtService > 0 ? (ebitda - capex) / debtService : null,
    covMaxLev, covMinDSCR,
    capacity: covMaxLev != null && ebitda > 0 ? Math.max(0, covMaxLev * ebitda - netDebt) : null,
  };
}

export function levStatus(lev: number | null, cov: number | null): 'green' | 'amber' | 'red' | 'na' {
  if (lev == null || cov == null) return 'na';
  if (lev >= cov) return 'red'; if (lev >= 0.85 * cov) return 'amber'; return 'green';
}
export function dscrStatus(dscr: number | null, cov: number | null): 'green' | 'amber' | 'red' | 'na' {
  if (dscr == null || cov == null) return 'na';
  if (dscr <= cov) return 'red'; if (dscr <= 1.15 * cov) return 'amber'; return 'green';
}

export interface ProFormaResult { pro: Consolidation; verdict: 'pass' | 'breach'; capacityUsedPct: number | null }
export function proFormaTest(facs: FacilityLite[], opcos: OpCoLite[], capexPct: number, addEbitda: number, addDraw: number, rateBps: number): ProFormaResult {
  const base = consolidate(facs, opcos, capexPct);
  const pro = consolidate([...facs, { drawn: addDraw, rateBps, amortAnnual: 0, maxLeverage: null, minDSCR: null }], [...opcos, { name: 'pro-forma', ebitda: addEbitda, ownership: 1 }], capexPct);
  const breach = (pro.covMaxLev != null && pro.leverage != null && pro.leverage > pro.covMaxLev) || (pro.covMinDSCR != null && pro.dscr != null && pro.dscr < pro.covMinDSCR);
  return { pro, verdict: breach ? 'breach' : 'pass', capacityUsedPct: base.capacity && base.capacity > 0 ? Math.min(100, addDraw / base.capacity * 100) : null };
}
