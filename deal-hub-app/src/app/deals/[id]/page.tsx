// Module B — Deal Workspace shell (server component). The 23 Kodiak-parity pages
// group into MEMO / SCORING / AGENTIC OUTPUTS / TECHNICAL. This scaffold renders
// the top bar (with the EV-bridge entry multiple) and the nav; page bodies + the
// AI pipeline arrive in M2–M6 per the consolidated build order (PRD §0.4).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { entryMultiple, dash, money, mult } from '@/lib/finance';

export const dynamic = 'force-dynamic';

const PAGES: Record<string, string[]> = {
  MEMO: ['Executive Summary', 'Financials', 'Revenue Mix & Customers', 'Market', 'Investment Thesis',
    'Growth Plan & Strategy', 'Risks & Mitigants', 'Projections', 'Transaction', 'Governance & Terms', 'Exit Path'],
  SCORING: ['Quantitative Scoring', 'Qualitative Scoring', 'Diligence Qs'],
  'AGENTIC OUTPUTS': ['Tax Returns', 'Call Summaries', 'LBO Analysis', 'Similar Deals & Patterns',
    'Cohort Analysis', 'Industry Comparison', 'Dataroom & Checklist', 'Memo Extras'],
  TECHNICAL: ['Cross-Check Register'],
};

export default async function Workspace({ params }: { params: { id: string } }) {
  const d = await prisma.deal.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!d) notFound();
  const pending = await prisma.proposedValue.count({ where: { dealId: params.id, status: 'pending' } }).catch(() => 0);
  const em = entryMultiple(d.evM, d.ebitdaM);

  return (
    <div>
      <div className="bg-ink text-white rounded-xl p-4 flex items-center gap-4 flex-wrap mb-4">
        <Link href="/deals" className="border border-white/20 rounded-md px-3 py-1.5 text-sm">← All deals</Link>
        <span className="text-lg font-semibold">{d.projectName}</span>
        {d.dealType && <span className="text-[11px] bg-white/15 rounded-full px-2.5 py-1">{d.dealType}</span>}
        <span className="text-[11px] bg-white/15 rounded-full px-2.5 py-1">{d.status}</span>
        <Link href={`/deals/${d.id}/dataroom`} className="border border-white/20 rounded-md px-3 py-1.5 text-sm">Dataroom</Link>
        {pending > 0 && <Link href={`/deals/${d.id}/review`} className="rounded-md bg-amber-400 text-ink px-3 py-1.5 text-sm font-medium">{pending} to review</Link>}
        <div className="ml-auto flex gap-6 text-right">
          <Metric label="LTM Rev" v={dash(d.revenueM, money)} />
          <Metric label="LTM EBITDA" v={dash(d.ebitdaM, money)} />
          <Metric label="EV/EBITDA" v={dash(em.value, mult)} />
          <Metric label="LTV" v="—" />
          <Metric label="Base MOIC" v="—" />
        </div>
      </div>
      <div className="grid grid-cols-[210px_1fr] gap-4 items-start">
        <nav className="bg-white border rounded-lg p-2 text-sm">
          {Object.entries(PAGES).map(([grp, items]) => (
            <div key={grp}>
              <div className="text-[10px] uppercase tracking-wide text-neutral-400 px-2 pt-3 pb-1">{grp}</div>
              {items.map((it) => (
                it === 'Dataroom & Checklist'
                  ? <Link key={it} href={`/deals/${d.id}/dataroom`} className="block px-2 py-1.5 rounded-md text-accent hover:bg-neutral-100">{it}</Link>
                  : <div key={it} className="px-2 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-default">{it}</div>
              ))}
            </div>
          ))}
        </nav>
        <div className="bg-white border rounded-lg p-6 min-h-[400px]">
          <h2 className="text-lg font-semibold mb-1">Executive Summary</h2>
          <p className="text-sm text-neutral-500 mb-4">Scaffold. Page bodies + the AI document pipeline land in M2–M6.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Entry Multiple" value={dash(em.value, mult)} note={em.value != null ? em.basisNote : `refuses to render — needs ${em.missing}`} prov="CALCULATED" />
            <Card label="LTM Revenue" value={dash(d.revenueM, money)} prov="MANUAL" />
            <Card label="LTM EBITDA" value={dash(d.ebitdaM, money)} prov="MANUAL" />
            <Card label="TEV" value={dash(d.evM, money)} prov="MANUAL" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, v }: { label: string; v: string }) {
  return (<div><div className="text-[10px] uppercase text-white/50">{label}</div><div className="font-semibold">{v}</div></div>);
}
function Card({ label, value, note, prov }: { label: string; value: string; note?: string; prov: string }) {
  return (
    <div className="border rounded-lg p-3" title={`${prov}${note ? ' — ' + note : ''}`}>
      <div className="text-[10px] uppercase text-neutral-500">{label}</div>
      <div className="text-xl font-semibold">{value} <span className="text-[9px] align-middle bg-blue-50 text-accent rounded px-1">{prov === 'CALCULATED' ? 'CALC' : 'MAN'}</span></div>
      {note && <div className="text-[11px] text-neutral-500 mt-0.5">{note}</div>}
    </div>
  );
}
