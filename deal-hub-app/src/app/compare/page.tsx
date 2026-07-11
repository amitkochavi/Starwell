// Module E — Comparison view. /compare?ids=a,b,c side-by-side; else a picker.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { entryMultiple, marginPct, dash, money, mult, pct } from '@/lib/finance';
import ComparePicker from '@/components/ComparePicker';

export const dynamic = 'force-dynamic';

export default async function Compare({ searchParams }: { searchParams: { ids?: string } }) {
  const ids = (searchParams.ids || '').split(',').filter(Boolean).slice(0, 6);
  if (ids.length < 2) {
    const deals = await prisma.deal.findMany({ orderBy: { dateOfEntry: 'desc' } });
    return <div><h1 className="text-2xl font-semibold mb-4">Compare deals</h1><ComparePicker deals={deals.map((d) => ({ id: d.id, projectName: d.projectName, status: d.status }))} /></div>;
  }
  const deals = await prisma.deal.findMany({ where: { id: { in: ids } } });
  deals.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const em = (d: typeof deals[0]) => entryMultiple(d.evM, d.ebitdaM).value;

  type Row = { group: string; label: string; get: (d: typeof deals[0]) => number | string | null; dir?: 1 | -1; fmt?: (v: number) => string };
  const ROWS: Row[] = [
    { group: 'Identity', label: 'Status', get: (d) => d.status },
    { group: 'Identity', label: 'Deal type', get: (d) => d.dealType || '—' },
    { group: 'Identity', label: 'Industry', get: (d) => d.subIndustry || d.industry || '—' },
    { group: 'Price & Deal', label: 'TEV', get: (d) => d.evM, fmt: money },
    { group: 'Price & Deal', label: 'Entry multiple', get: (d) => em(d), dir: -1, fmt: mult },
    { group: 'Financials', label: 'LTM Revenue', get: (d) => d.revenueM, dir: 1, fmt: money },
    { group: 'Financials', label: 'LTM EBITDA', get: (d) => d.ebitdaM, dir: 1, fmt: money },
    { group: 'Financials', label: 'EBITDA margin', get: (d) => marginPct(d.ebitdaM, d.revenueM), dir: 1, fmt: pct },
    { group: 'Scores', label: 'Overall score', get: (d) => d.score, dir: 1, fmt: (v) => v + ' /5' },
  ];
  let lastGroup = '';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Compare deals</h1>
        <Link href="/compare" className="text-sm text-accent">← Change selection</Link>
      </div>
      <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: 220 + deals.length * 160 }}>
          <thead className="bg-neutral-50"><tr><th className="text-left p-3 text-[11px] uppercase text-neutral-500">Metric</th>{deals.map((d) => <th key={d.id} className="text-right p-3">{d.projectName}</th>)}</tr></thead>
          <tbody>
            {ROWS.map((r) => {
              const vals = deals.map(r.get);
              const nums = vals.filter((v): v is number => typeof v === 'number');
              const best = r.dir && nums.length > 1 ? (r.dir > 0 ? Math.max(...nums) : Math.min(...nums)) : null;
              const grpHeader = r.group !== lastGroup; lastGroup = r.group;
              return (
                <tr key={r.label} className="border-t">
                  {grpHeader ? null : null}
                  <td className="p-3 text-neutral-600">{grpHeader && <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{r.group}</div>}{r.label}</td>
                  {deals.map((d, i) => { const v = vals[i]; const isBest = best != null && v === best;
                    const disp = typeof v === 'number' ? (r.fmt ? dash(v, r.fmt) : String(v)) : (v ?? '—');
                    return <td key={d.id} className={`p-3 text-right ${isBest ? 'bg-green-50 font-semibold' : ''}`}>{disp}</td>; })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400 mt-2">Green = best in row (lower entry multiple / higher revenue, EBITDA, margin, score). Missing values excluded.</p>
    </div>
  );
}
