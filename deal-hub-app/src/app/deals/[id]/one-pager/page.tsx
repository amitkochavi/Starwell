// Deal one-pager (Module F export) — a print-optimized Executive Summary.
// "Print / Save as PDF" produces the single-page PDF; "File in Artifact Library"
// creates the Deal-memos entry.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { entryMultiple, marginPct, dash, money, mult, pct } from '@/lib/finance';
import { economics, type YearRow } from '@/lib/economics';
import OnePagerActions from '@/components/OnePagerActions';

export const dynamic = 'force-dynamic';

export default async function OnePager({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!deal) notFound();
  const [sections, risks] = await Promise.all([
    prisma.memoSection.findMany({ where: { dealId: params.id } }),
    prisma.riskItem.groupBy({ by: ['severity'], where: { dealId: params.id }, _count: true }).catch(() => [] as { severity: string; _count: number }[]),
  ]);
  const synthesis = sections.find((s) => s.page === 'exec')?.body || '';
  let years: YearRow[] = [];
  try { const f = sections.find((s) => s.page === 'financials'); years = f?.data ? JSON.parse(f.data).years || [] : []; } catch { /* ignore */ }
  const econ = economics(deal, years);
  const em = entryMultiple(deal.evM, deal.ebitdaM).value;
  const flag = (s: string) => risks.find((r) => r.severity === s)?._count || 0;

  const cards: [string, string][] = [
    ['LTM Revenue', dash(deal.revenueM, money)], ['LTM EBITDA', dash(deal.ebitdaM, money)],
    ['EBITDA margin', dash(marginPct(deal.ebitdaM, deal.revenueM), pct)], ['TEV', dash(deal.evM, money)],
    ['Entry multiple', dash(em, mult)], ['Rev CAGR 3Y', dash(econ.revCagr3, pct)],
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <OnePagerActions dealId={params.id} title={deal.projectName} />
      <div className="bg-white border rounded-lg p-8 print:border-0 print:p-0">
        <div className="flex items-baseline justify-between border-b pb-3 mb-4">
          <div><div className="text-[11px] uppercase tracking-wide text-neutral-400">Starwell Deal Hub — one-pager</div><h1 className="text-2xl font-semibold">{deal.projectName}</h1></div>
          <div className="text-right text-sm text-neutral-500">{deal.dealType} · {deal.status}<br />{deal.subIndustry || deal.industry}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {cards.map(([l, v]) => <div key={l} className="border rounded-lg p-2.5"><div className="text-[10px] uppercase text-neutral-500">{l}</div><div className="text-lg font-semibold">{v}</div></div>)}
        </div>
        <h2 className="text-sm font-semibold mb-1">Deal Synthesis</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">{synthesis || 'No synthesis written yet.'}</p>
        <div className="mt-5 flex gap-6 text-sm">
          <span><b className="text-red-600">{flag('Red')}</b> Red</span>
          <span><b className="text-amber-600">{flag('Yellow')}</b> Yellow</span>
          <span><b className="text-green-600">{flag('Green')}</b> Green</span>
        </div>
      </div>
    </div>
  );
}
