// Workspace chrome (top bar + 23-page nav) shared by the memo/scoring/technical
// pages. Dataroom & Review live outside this group so they keep their own layout.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { entryMultiple, dash, money, mult } from '@/lib/finance';
import WorkspaceNav, { type NavGroup } from '@/components/WorkspaceNav';

export const dynamic = 'force-dynamic';

const GROUPS: NavGroup[] = [
  { g: 'MEMO', items: [
    ['Executive Summary', 'exec'], ['Financials', 'financials'], ['Revenue Mix & Customers', null],
    ['Market', null], ['Investment Thesis', null], ['Growth Plan & Strategy', null], ['Risks & Mitigants', null],
    ['Projections', null], ['Transaction', null], ['Governance & Terms', null], ['Exit Path', null] ] },
  { g: 'SCORING', items: [['Quantitative Scoring', null], ['Qualitative Scoring', null], ['Diligence Qs', null]] },
  { g: 'AGENTIC OUTPUTS', items: [
    ['Tax Returns', null], ['Call Summaries', null], ['LBO Analysis', null], ['Similar Deals & Patterns', null],
    ['Cohort Analysis', null], ['Industry Comparison', null], ['Dataroom & Checklist', 'dataroom'], ['Memo Extras', null] ] },
  { g: 'TECHNICAL', items: [['Cross-Check Register', 'cross-check']] },
];

export default async function WsLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const d = await prisma.deal.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!d) notFound();
  const pending = await prisma.proposedValue.count({ where: { dealId: params.id, status: 'pending' } }).catch(() => 0);
  const em = entryMultiple(d.evM, d.ebitdaM).value;

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
          <M label="LTM Rev" v={dash(d.revenueM, money)} />
          <M label="LTM EBITDA" v={dash(d.ebitdaM, money)} />
          <M label="EV/EBITDA" v={dash(em, mult)} />
          <M label="LTV" v="—" />
          <M label="Base MOIC" v="—" />
        </div>
      </div>
      <div className="grid grid-cols-[210px_1fr] gap-4 items-start">
        <WorkspaceNav dealId={params.id} groups={GROUPS} />
        <div>{children}</div>
      </div>
    </div>
  );
}
function M({ label, v }: { label: string; v: string }) {
  return (<div><div className="text-[10px] uppercase text-white/50">{label}</div><div className="font-semibold">{v}</div></div>);
}
