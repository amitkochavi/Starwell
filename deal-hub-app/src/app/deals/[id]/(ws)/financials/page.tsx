// B.2 Financials — narrative + editable year-by-year table. Edits recompute the
// Exec CAGRs and the CIM-vs-Financials cross-check (Agent 2).
import { prisma } from '@/lib/prisma';
import MemoEditor from '@/components/MemoEditor';
import FinancialsTable from '@/components/FinancialsTable';

export const dynamic = 'force-dynamic';

export default async function Financials({ params }: { params: { id: string } }) {
  const sections = await prisma.memoSection.findMany({ where: { dealId: params.id } });
  const narrative = sections.find((s) => s.page === 'financials-narrative')?.body || '';
  let years: { y: string; rev: string; ebitda: string; margin: string; capex: string }[] = [];
  try { const f = sections.find((s) => s.page === 'financials'); years = f?.data ? JSON.parse(f.data).years || [] : []; } catch { /* ignore */ }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Financials</h2>
      <p className="text-sm text-neutral-500 mb-4">Enter the year-by-year figures; the Executive Summary CAGRs and the cross-check update automatically.</p>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Narrative</h3>
      <MemoEditor dealId={params.id} page="financials-narrative" initial={narrative} placeholder="Earnings quality, volatility, margin story, cash conversion, leverage implications." />

      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Year-by-year</h3>
      <FinancialsTable dealId={params.id} initial={years} />
    </div>
  );
}
