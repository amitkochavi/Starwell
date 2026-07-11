// Cohort analytics (PRD B.19) — DETERMINISTIC code (the LLM only writes the
// Methodology narrative). NRR/GRR/HHI/concentration from customer-year revenue.
// Verified against a hand-checked 3-customer fixture (criterion 17).

export interface CustomerYear { customer: string; year: number; revenue: number }

export interface YearStat { year: number; revenue: number; active: number; neu: number; churned: number; retained: number; avg: number; median: number }
export interface Bridge { year: number; start: number; upsell: number; downsell: number; churn: number; neu: number; end: number; nrr: number | null; grr: number | null; newPct: number | null }
export interface Concentration { year: number; top1: number; top5: number; top10: number; top20: number; hhi: number; effN: number; gini: number }
export interface TopCustomer { customer: string; lifetime: number; byYear: Record<number, number> }
export interface CohortResult {
  years: number[]; yearStats: YearStat[]; bridges: Bridge[]; concentration: Concentration[]; top25: TopCustomer[];
  headline: { latestYear: number; latestRevenue: number; active: number; neu: number; churned: number; nrr: number | null; grr: number | null; top1: number; hhi: number; repeatRate: number };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function gini(vals: number[]): number {
  const v = vals.filter((x) => x > 0).sort((a, b) => a - b); const n = v.length;
  if (n === 0) return 0;
  const sum = v.reduce((a, b) => a + b, 0); if (sum === 0) return 0;
  let g = 0; for (let i = 0; i < n; i++) g += (2 * (i + 1) - n - 1) * v[i];
  return g / (n * sum);
}
function concentration(year: number, revByCust: Map<string, number>): Concentration {
  const shares = [...revByCust.values()].filter((r) => r > 0);
  const total = shares.reduce((a, b) => a + b, 0);
  const sorted = [...shares].sort((a, b) => b - a);
  const topN = (n: number) => total === 0 ? 0 : sorted.slice(0, n).reduce((a, b) => a + b, 0) / total * 100;
  const hhi = total === 0 ? 0 : sorted.reduce((a, r) => a + (r / total) ** 2, 0) * 10000;
  return { year, top1: topN(1), top5: topN(5), top10: topN(10), top20: topN(20), hhi, effN: hhi === 0 ? 0 : 10000 / hhi, gini: gini(shares) };
}

export function analyzeCohort(rows: CustomerYear[]): CohortResult {
  const byYear = new Map<number, Map<string, number>>();
  const customers = new Set<string>();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, new Map());
    const m = byYear.get(r.year)!;
    m.set(r.customer, (m.get(r.customer) || 0) + r.revenue);
    customers.add(r.customer);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);

  const yearStats: YearStat[] = years.map((y, i) => {
    const cur = byYear.get(y)!;
    const prev = i > 0 ? byYear.get(years[i - 1])! : new Map<string, number>();
    const active = [...cur.entries()].filter(([, v]) => v > 0);
    const neu = active.filter(([c]) => !((prev.get(c) ?? 0) > 0)).length;
    const churned = [...prev.entries()].filter(([c, v]) => v > 0 && !(cur.get(c)! > 0)).length;
    const retained = active.length - neu;
    const revenue = active.reduce((a, [, v]) => a + v, 0);
    const vals = active.map(([, v]) => v);
    return { year: y, revenue, active: active.length, neu, churned, retained, avg: active.length ? revenue / active.length : 0, median: median(vals) };
  });

  const bridges: Bridge[] = years.slice(1).map((y, idx) => {
    const cur = byYear.get(y)!; const prev = byYear.get(years[idx])!;
    let start = 0, upsell = 0, downsell = 0, churn = 0, neu = 0;
    for (const [c, pv] of prev) { if (pv <= 0) continue; start += pv;
      const cv = cur.get(c) || 0;
      if (cv <= 0) churn += pv; else if (cv > pv) upsell += cv - pv; else downsell += pv - cv;
    }
    for (const [c, cv] of cur) { if (cv > 0 && !(prev.get(c)! > 0)) neu += cv; }
    const end = start + upsell - downsell - churn + neu;
    return { year: y, start, upsell, downsell, churn, neu, end,
      nrr: start ? (start + upsell - downsell - churn) / start * 100 : null,
      grr: start ? (start - downsell - churn) / start * 100 : null,
      newPct: start ? neu / start * 100 : null };
  });

  const conc: Concentration[] = years.map((y) => concentration(y, byYear.get(y)!));

  const lifetime = new Map<string, number>();
  for (const c of customers) { let s = 0; for (const y of years) s += byYear.get(y)!.get(c) || 0; lifetime.set(c, s); }
  const top25: TopCustomer[] = [...lifetime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([customer, lt]) => {
    const byY: Record<number, number> = {}; for (const y of years) byY[y] = byYear.get(y)!.get(customer) || 0;
    return { customer, lifetime: lt, byYear: byY };
  });

  const repeat = [...customers].filter((c) => years.filter((y) => (byYear.get(y)!.get(c) || 0) > 0).length > 1).length;
  const lastY = years[years.length - 1];
  const ys = yearStats[yearStats.length - 1];
  const lb = bridges[bridges.length - 1];
  const lc = conc[conc.length - 1];
  return {
    years, yearStats, bridges, concentration: conc, top25,
    headline: {
      latestYear: lastY, latestRevenue: ys?.revenue || 0, active: ys?.active || 0, neu: ys?.neu || 0, churned: ys?.churned || 0,
      nrr: lb?.nrr ?? null, grr: lb?.grr ?? null, top1: lc?.top1 || 0, hhi: lc?.hhi || 0,
      repeatRate: customers.size ? repeat / customers.size * 100 : 0,
    },
  };
}
