import { getSection, asStrMap } from '@/lib/memo';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
export default async function Projections({ params }: { params: { id: string } }) {
  const { data } = await getSection(params.id, 'projections');
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Projections</h2>
      <p className="text-sm text-neutral-500 mb-4">Base / Bull / Bear assumptions. The LBO page consumes these.</p>
      <SectionEditor dealId={params.id} page="projections" mode="blocks" labels={['Base case assumptions', 'Bull case assumptions', 'Bear case assumptions']} initial={asStrMap((data as { blocks?: unknown }).blocks)} />
    </div>
  );
}
