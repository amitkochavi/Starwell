import { prisma } from '@/lib/prisma';
import ScoringEditor from '@/components/ScoringEditor';
export const dynamic = 'force-dynamic';
const AXES = ['Business Model', 'Team & Owner Dependence', 'Market & Competition', 'Transition & Execution Risk', 'Data Quality & Diligence Confidence'];
export default async function Qual({ params }: { params: { id: string } }) {
  const rows = await prisma.scoreEntry.findMany({ where: { dealId: params.id, kind: 'qual' } });
  const initial = Object.fromEntries(rows.map((r) => [r.axis, { value: r.value, rationale: r.rationale || '' }]));
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Qualitative Scoring</h2>
      <p className="text-sm text-neutral-500 mb-4">Five themes scored 1–5 with rationale; weighted mean → Qual Integral.</p>
      <ScoringEditor dealId={params.id} kind="qual" axes={AXES} weightLabel="Qual Integral (32.5% weight)" initial={initial} />
    </div>
  );
}
