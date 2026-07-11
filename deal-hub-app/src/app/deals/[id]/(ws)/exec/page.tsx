// B.1 Executive Summary — Deal Synthesis + Economics at a Glance (12 cards,
// computed from approved values with provenance) + Flag Tally + Integrals.
import { prisma } from '@/lib/prisma';
import { dash, money, mult, pct } from '@/lib/finance';
import { economics, type YearRow } from '@/lib/economics';
import MemoEditor from '@/components/MemoEditor';
import SpiderNets from '@/components/SpiderNets';

export const dynamic = 'force-dynamic';

function Card({ label, value, sub, missing, prov, tip }: { label: string; value: string; sub?: string; missing?: boolean; prov?: [string, string]; tip?: string }) {
  const chip = prov && ({ CALC: 'bg-blue-50 text-accent', EXTRACTED: 'bg-green-50 text-green-700', MANUAL: 'bg-neutral-100 text-neutral-600' } as Record<string, string>)[prov[0]];
  return (
    <div className={`border rounded-lg p-3 ${missing ? 'opacity-70' : ''}`} title={tip}>
      <div className="text-[10px] uppercase text-neutral-500">{label}</div>
      <div className={`text-xl font-semibold ${missing ? 'text-neutral-400' : ''}`}>{value}
        {prov && <span className={`ml-1.5 text-[9px] align-middle rounded px-1 ${chip}`}>{prov[1]}</span>}
      </div>
      {sub && <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function ExecSummary({ params }: { params: { id: string } }) {
  const [deal, sections, accepted, flags, scores] = await Promise.all([
    prisma.deal.findUnique({ where: { id: params.id } }),
    prisma.memoSection.findMany({ where: { dealId: params.id } }),
    prisma.proposedValue.findMany({ where: { dealId: params.id, status: 'accepted' }, select: { field: true } }),
    prisma.riskItem.groupBy({ by: ['severity'], where: { dealId: params.id }, _count: true }).catch(() => [] as { severity: string; _count: number }[]),
    prisma.scoreEntry.findMany({ where: { dealId: params.id } }),
  ]);
  if (!deal) return <div>Deal not found.</div>;

  const execBody = sections.find((s) => s.page === 'exec')?.body || '';
  let years: YearRow[] = [];
  try { const f = sections.find((s) => s.page === 'financials'); years = f?.data ? JSON.parse(f.data).years || [] : []; } catch { /* ignore */ }
  const econ = economics(deal, years);
  const ext = new Set(accepted.map((a) => a.field));
  const prov = (field: string): [string, string] => (ext.has(field) ? ['EXTRACTED', 'EXTRACTED'] : ['MANUAL', 'MANUAL']);

  const flagN = (s: string) => flags.find((f) => f.severity === s)?._count || 0;

  const mean = (kind: string) => {
    const vs = scores.filter((s) => s.kind === kind && s.value != null).map((s) => s.value as number);
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  };
  const quant = mean('quant'), qual = mean('qual');

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Executive Summary</h2>
      <p className="text-sm text-neutral-500 mb-4">Economics compute from approved values; accept extractions on the Review screen to fill them in.</p>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Deal Synthesis</h3>
      <MemoEditor dealId={params.id} page="exec" initial={execBody} placeholder="2-paragraph synthesis — what the business is, why attractive, why cautious, expected returns." />

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Economics at a Glance <span className="text-[9px] bg-blue-50 text-accent rounded px-1 align-middle">CALC</span></h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Entry Multiple" value={dash(econ.entryMultiple, mult)} sub={`EV ÷ ${deal.valuationBasis || 'EBITDA'}`} missing={econ.entryMultiple == null} prov={['CALC', 'CALC']} tip={econ.entryMultiple != null ? econ.basisNote : `refuses to render — needs ${econ.entryMissing}`} />
        <Card label="LTM Revenue" value={dash(deal.revenueM, money)} missing={deal.revenueM == null} prov={prov('revenueM')} />
        <Card label="LTM EBITDA" value={dash(deal.ebitdaM, money)} sub={econ.margin != null ? `Margin ${pct(econ.margin)}` : undefined} missing={deal.ebitdaM == null} prov={prov('ebitdaM')} />
        <Card label="TEV" value={dash(deal.evM, money)} missing={deal.evM == null} prov={prov('evM')} />
        <Card label="Gross Margin" value="—" missing />
        <Card label="LTV %" value="—" sub="Debt/EBITDA —" missing />
        <Card label="UFCF Y1" value="—" sub="yield —" missing />
        <Card label="Base MOIC" value="—" sub="payback —" missing />
        <Card label="Rev CAGR 3Y" value={dash(econ.revCagr3, pct)} missing={econ.revCagr3 == null} prov={econ.revCagr3 != null ? ['CALC', 'CALC'] : undefined} tip="From the Financials year table" />
        <Card label="EBITDA CAGR 3Y" value={dash(econ.ebitdaCagr3, pct)} missing={econ.ebitdaCagr3 == null} prov={econ.ebitdaCagr3 != null ? ['CALC', 'CALC'] : undefined} />
        <Card label="Exit Multiple" value="—" missing />
        <Card label="Top-1 Customer %" value="—" missing />
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Flag Tally &amp; Gate</h3>
      <div className="flex gap-6">
        {(['Red', 'Yellow', 'Green'] as const).map((s) => (
          <div key={s} className="text-sm"><b className={`block text-xl ${s === 'Red' ? 'text-red-600' : s === 'Yellow' ? 'text-amber-600' : 'text-green-600'}`}>{flagN(s)}</b>{s}</div>
        ))}
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Integrals</h3>
      <div className="flex gap-10">
        <div><div className="text-[11px] text-neutral-500">Quant Integral (67.5%)</div><div className="text-2xl font-semibold">{quant != null ? quant.toFixed(2) + ' /5' : '—'}</div></div>
        <div><div className="text-[11px] text-neutral-500">Qual Integral (32.5%)</div><div className="text-2xl font-semibold">{qual != null ? qual.toFixed(2) + ' /5' : '—'}</div></div>
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Score Spider Nets</h3>
      <SpiderNets
        quant={scores.filter((s) => s.kind === 'quant' && s.value != null).map((s) => ({ axis: s.axis, value: s.value as number }))}
        qual={scores.filter((s) => s.kind === 'qual' && s.value != null).map((s) => ({ axis: s.axis, value: s.value as number }))}
      />
    </div>
  );
}
