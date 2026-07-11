// B.15 Tax Returns — header + net-income bridge waterfall (per year-pair) +
// driver drill-down. Data comes from the Tax Return Analyst agent
// (Dataroom → upload a tax return → Process).
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { netIncomeBridge, type TaxData } from '@/lib/tax';
import BridgeChart from '@/components/BridgeChart';

export const dynamic = 'force-dynamic';
const usd = (n?: number) => (n == null ? '—' : '$' + Math.round(n).toLocaleString());

export default async function TaxReturns({ params }: { params: { id: string } }) {
  const sec = await prisma.memoSection.findFirst({ where: { dealId: params.id, page: 'tax' } });
  let data: TaxData | null = null;
  try { data = sec?.data ? JSON.parse(sec.data) : null; } catch { data = null; }

  if (!data || !data.years?.length) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-1">Tax Returns</h2>
        <p className="text-sm text-neutral-500">No tax-return analysis yet. Go to <Link href={`/deals/${params.id}/dataroom`} className="text-accent">Dataroom</Link>, upload a tax-return PDF (1120-S / 1065 / Sch C), and click <b>Process all documents</b> — the Tax Return Analyst builds the net-income bridge and validates it against the CIM.</p>
      </div>
    );
  }

  const years = [...data.years].sort((a, b) => a.year - b.year);
  const pairs = years.slice(1).map((cur, i) => ({ prior: years[i], cur }));
  const latest = pairs[pairs.length - 1];

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold">Tax Returns</h2>
        <div className="text-xs text-neutral-500">{data.entity} · {data.form} · FY{years[0].year}–FY{years[years.length - 1].year}</div>
      </div>
      {data.validation?.length ? (
        <div className="flex gap-2 mb-4 flex-wrap">
          {data.validation.map((v) => (
            <span key={v.year} className={`text-[11px] rounded px-2 py-0.5 ${v.status === 'PASS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>FY{v.year} {v.status} · {v.conf}</span>
          ))}
        </div>
      ) : null}

      {latest && (
        <>
          <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Net-income bridge · FY{latest.prior.year} → FY{latest.cur.year}</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Kpi label={`Prior FY${latest.prior.year} net income`} v={usd(latest.prior.netIncome)} />
            <Kpi label={`Current FY${latest.cur.year} net income`} v={usd(latest.cur.netIncome)} />
            <Kpi label="YoY change" v={usd((latest.cur.netIncome || 0) - (latest.prior.netIncome || 0))} neg={(latest.cur.netIncome || 0) < (latest.prior.netIncome || 0)} />
          </div>
          <BridgeChart steps={netIncomeBridge(latest.prior, latest.cur)} />
        </>
      )}

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Income statement &amp; EBITDA walk</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
            <tr><th className="p-2 border-b text-left">Line</th>{years.map((y) => <th key={y.year} className="p-2 border-b text-right">FY{y.year}</th>)}</tr>
          </thead>
          <tbody>
            {([['Revenue', 'revenue'], ['COGS', 'cogs'], ['Operating Expenses', 'opex'], ['D&A', 'da'], ['Net Income', 'netIncome']] as [string, keyof typeof years[0]][]).map(([label, k]) => (
              <tr key={k} className="border-b">
                <td className="p-2">{label}</td>
                {years.map((y) => <td key={y.year} className="p-2 text-right">{usd(y[k] as number | undefined)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.drivers?.length ? (
        <>
          <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Driver detail · drill-down</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse min-w-[560px]">
              <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
                <tr><th className="p-2 border-b text-left">Line item</th>{years.map((y) => <th key={y.year} className="p-2 border-b text-right">FY{y.year}</th>)}</tr>
              </thead>
              <tbody>
                {data.drivers.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{d.parent ? <span className="text-neutral-400">{d.parent} › </span> : null}{d.label}</td>
                    {years.map((y) => <td key={y.year} className="p-2 text-right">{d.values[y.year] != null ? usd(d.values[y.year]) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, v, neg }: { label: string; v: string; neg?: boolean }) {
  return (<div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">{label}</div><div className={`text-xl font-semibold ${neg ? 'text-red-600' : ''}`}>{v}</div></div>);
}
