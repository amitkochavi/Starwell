// B.19 Cohort Analysis — deterministic NRR/GRR/HHI/concentration from the
// uploaded customer file. Executive Summary + per-year table + concentration +
// retention bridges + Top-25 matrix.
import { prisma } from '@/lib/prisma';
import { analyzeCohort, type CustomerYear } from '@/lib/cohort';
import CohortUploader from '@/components/CohortUploader';
import CohortChart from '@/components/CohortChart';

export const dynamic = 'force-dynamic';

const money0 = (n: number) => '$' + Math.round(n).toLocaleString();
const pct1 = (n: number | null) => n == null ? '—' : n.toFixed(1) + '%';

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (<div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">{label}</div><div className="text-xl font-semibold">{value}</div>{sub && <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>}</div>);
}

export default async function Cohort({ params }: { params: { id: string } }) {
  const ds = await prisma.cohortDataset.findFirst({ where: { dealId: params.id }, orderBy: { createdAt: 'desc' }, include: { rows: true } });
  if (!ds || !ds.rows.length) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-1">Cohort Analysis</h2>
        <p className="text-sm text-neutral-500 mb-4">Upload a customer-level revenue file to compute NRR, GRR, HHI, concentration and retention bridges. Deterministic — the LLM only writes the methodology notes.</p>
        <CohortUploader dealId={params.id} />
        <p className="text-xs text-neutral-400 mt-3">Accepts a long file (columns <b>customer, year, revenue</b>) or a wide pivot (a customer column plus one column per year).</p>
      </div>
    );
  }
  const rows: CustomerYear[] = ds.rows.map((r) => ({ customer: r.customer, year: r.year, revenue: r.revenue }));
  const R = analyzeCohort(rows);
  const H = R.headline;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Cohort Analysis</h2>
        <CohortUploader dealId={params.id} />
      </div>
      <p className="text-sm text-neutral-500 mb-4">{ds.filename} · {ds.rows.length} rows · {R.years[0]}–{R.years[R.years.length - 1]}</p>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Executive Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <Card label="Latest revenue" value={money0(H.latestRevenue)} sub={`FY${H.latestYear}`} />
        <Card label="Active customers" value={String(H.active)} sub={`${H.neu} new · ${H.churned} churned`} />
        <Card label="Net revenue retention" value={pct1(H.nrr)} sub="latest year-pair" />
        <Card label="Gross revenue retention" value={pct1(H.grr)} sub="latest year-pair" />
        <Card label="Top-1 concentration" value={pct1(H.top1)} />
        <Card label="HHI" value={Math.round(H.hhi).toLocaleString()} sub="10,000 = monopoly" />
        <Card label="Repeat-customer rate" value={pct1(H.repeatRate)} />
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Annual revenue &amp; customer count</h3>
      <CohortChart data={R.yearStats.map((y) => ({ year: y.year, revenue: y.revenue, active: y.active }))} />

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Per-year detail</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
            <tr>{['Year', 'Revenue', 'Active', 'New', 'Churned', 'Retained', 'Avg / cust', 'Median / cust'].map((h, i) => <th key={h} className={`p-2 border-b ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {R.yearStats.map((y) => (
              <tr key={y.year} className="border-b">
                <td className="p-2">{y.year}</td>
                <td className="p-2 text-right">{money0(y.revenue)}</td>
                <td className="p-2 text-right">{y.active}</td>
                <td className="p-2 text-right">{y.neu}</td>
                <td className="p-2 text-right">{y.churned}</td>
                <td className="p-2 text-right">{y.retained}</td>
                <td className="p-2 text-right">{money0(y.avg)}</td>
                <td className="p-2 text-right">{money0(y.median)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Retention bridges</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
            <tr>{['Year', 'Start $', 'Upsell', 'Downsell', 'Churn', 'New', 'End $', 'NRR', 'GRR'].map((h, i) => <th key={h} className={`p-2 border-b ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {R.bridges.map((b) => (
              <tr key={b.year} className="border-b">
                <td className="p-2">{b.year}</td>
                <td className="p-2 text-right">{money0(b.start)}</td>
                <td className="p-2 text-right text-green-700">+{money0(b.upsell)}</td>
                <td className="p-2 text-right text-red-600">−{money0(b.downsell)}</td>
                <td className="p-2 text-right text-red-600">−{money0(b.churn)}</td>
                <td className="p-2 text-right text-green-700">+{money0(b.neu)}</td>
                <td className="p-2 text-right font-medium">{money0(b.end)}</td>
                <td className="p-2 text-right">{pct1(b.nrr)}</td>
                <td className="p-2 text-right">{pct1(b.grr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Customer concentration</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
            <tr>{['Year', 'Top-1', 'Top-5', 'Top-10', 'Top-20', 'HHI', 'Effective N', 'Gini'].map((h, i) => <th key={h} className={`p-2 border-b ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {R.concentration.map((c) => (
              <tr key={c.year} className="border-b">
                <td className="p-2">{c.year}</td>
                <td className="p-2 text-right">{pct1(c.top1)}</td>
                <td className="p-2 text-right">{pct1(c.top5)}</td>
                <td className="p-2 text-right">{pct1(c.top10)}</td>
                <td className="p-2 text-right">{pct1(c.top20)}</td>
                <td className="p-2 text-right">{Math.round(c.hhi).toLocaleString()}</td>
                <td className="p-2 text-right">{c.effN.toFixed(1)}</td>
                <td className="p-2 text-right">{c.gini.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Top 25 customers (by lifetime revenue)</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 200 + R.years.length * 90 }}>
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
            <tr><th className="p-2 border-b text-left">Customer</th><th className="p-2 border-b text-right">Lifetime</th>{R.years.map((y) => <th key={y} className="p-2 border-b text-right">{y}</th>)}</tr>
          </thead>
          <tbody>
            {R.top25.map((c) => (
              <tr key={c.customer} className="border-b">
                <td className="p-2 max-w-[220px] truncate">{c.customer}</td>
                <td className="p-2 text-right font-medium">{money0(c.lifetime)}</td>
                {R.years.map((y) => <td key={y} className="p-2 text-right text-neutral-600">{c.byYear[y] ? money0(c.byYear[y]) : '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
