import { getSection } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import DraftButton from '@/components/DraftButton';
export const dynamic = 'force-dynamic';
export default async function Market({ params }: { params: { id: string } }) {
  const { body } = await getSection(params.id, 'market');
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-semibold">Market</h2><DraftButton dealId={params.id} page="market" /></div>
      <p className="text-sm text-neutral-500 mb-4">Geography, competitive density, verticals, demand drivers, pricing environment.</p>
      <MemoEditor dealId={params.id} page="market" initial={body} placeholder="Market analysis — drafted from the CIM with citations, freely editable." />
    </div>
  );
}
