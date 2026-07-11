import { getSection, asStrMap } from '@/lib/memo';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
const TERMS = ['Board / control', 'Seller employment & transition', 'Non-compete', 'Reps & warranties', 'Conditions to close', 'Exclusivity dates', 'Escrow / holdback'];
export default async function Governance({ params }: { params: { id: string } }) {
  const { data } = await getSection(params.id, 'governance');
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Governance &amp; Terms</h2>
      <p className="text-sm text-neutral-500 mb-4">Key deal terms.</p>
      <SectionEditor dealId={params.id} page="governance" mode="blocks" labels={TERMS} initial={asStrMap((data as { blocks?: unknown }).blocks)} />
    </div>
  );
}
