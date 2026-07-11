// Tax Returns (B.15) — deterministic net-income bridge waterfall.
// prior NI → Revenue Δ → COGS Δ → OpEx Δ → D&A Δ → (Other) → current NI.
export interface TaxYear { year: number; revenue?: number; cogs?: number; opex?: number; da?: number; netIncome?: number }
export interface DriverRow { label: string; parent?: string; values: Record<number, number> } // FY -> amount
export interface TaxData { entity?: string; form?: string; years: TaxYear[]; drivers?: DriverRow[]; validation?: { year: number; status: string; conf: string }[] }

export interface BridgeStep { label: string; value: number; cumulative: number; kind: 'total' | 'up' | 'down' }

const n = (x?: number) => (x == null || Number.isNaN(x) ? 0 : x);

/** Net-income bridge between two consecutive years. */
export function netIncomeBridge(prior: TaxYear, cur: TaxYear): BridgeStep[] {
  const start = n(prior.netIncome);
  const revD = n(cur.revenue) - n(prior.revenue);            // + revenue raises NI
  const cogsD = -(n(cur.cogs) - n(prior.cogs));              // + COGS lowers NI
  const opexD = -(n(cur.opex) - n(prior.opex));
  const daD = -(n(cur.da) - n(prior.da));
  const end = n(cur.netIncome);
  const other = end - (start + revD + cogsD + opexD + daD);  // plug (tax/other) so the bridge ties
  const steps: BridgeStep[] = [];
  let cum = start;
  steps.push({ label: `${prior.year} Net Income`, value: start, cumulative: cum, kind: 'total' });
  for (const [label, v] of [['Revenue', revD], ['COGS', cogsD], ['Operating Expenses', opexD], ['Depreciation / Amortization', daD], ['Other', other]] as [string, number][]) {
    cum += v;
    steps.push({ label, value: v, cumulative: cum, kind: v >= 0 ? 'up' : 'down' });
  }
  steps.push({ label: `${cur.year} Net Income`, value: end, cumulative: end, kind: 'total' });
  return steps;
}

/** Validate tax-return revenue/EBITDA-ish figures against the CIM's approved deal
 * values. Returns discrepancies (>5% apart) for the Cross-Check Register. */
export function validateAgainstCim(latest: TaxYear, dealRevenueM: number | null, dealEbitdaM: number | null): { figure: string; detail: string }[] {
  const out: { figure: string; detail: string }[] = [];
  if (dealRevenueM != null && latest.revenue) {
    const taxRevM = latest.revenue / 1_000_000;
    if (Math.abs(taxRevM - dealRevenueM) / Math.abs(dealRevenueM) > 0.05)
      out.push({ figure: 'Revenue (CIM vs Tax Return)', detail: `CIM ${dealRevenueM} vs tax-return ${taxRevM.toFixed(2)} ($M)` });
  }
  return out;
}
