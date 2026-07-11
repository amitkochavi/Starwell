import { prisma } from '@/lib/prisma';
import ScoringEditor from '@/components/ScoringEditor';
export const dynamic = 'force-dynamic';
const AXES = ['Valuation & Leverage', 'Growth & Trajectory', 'Margins & Cash Conversion', 'Revenue Quality & Retention', 'Coverage & Structure'];
export default async function Quant({ params }: { params: { id: string } }) {
  const rows = await prisma.scoreEntry.findMany({ where: { dealId: params.id, kind: 'quant' } });
  const initial = Object.fromEntries(rows.map((r) => [r.axis, { value: r.value, rationale: r.rationale || '' }]));
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Quantitative Scoring</h2>
      <p className="text-sm text-neutral-500 mb-4">Five metric groups scored 1–5; weighted mean → Quant Integral. Unknown axes are excluded, never defaulted.</p>
      <ScoringEditor dealId={params.id} kind="quant" axes={AXES} weightLabel="Quant Integral (67.5% weight)" initial={initial} />
    </div>
  );
}
