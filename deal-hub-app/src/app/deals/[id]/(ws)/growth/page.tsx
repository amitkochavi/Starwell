import { getSection, asStrMap } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import DraftButton from '@/components/DraftButton';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
const BLOCKS = ['Growth Levers (pricing, cross-sell, contracts, tuck-ins)', '100-Day Plan', 'Org Plan', 'Roll-up Fit (if Deal Type = Roll-up)'];
export default async function Growth({ params }: { params: { id: string } }) {
  const { body, data } = await getSection(params.id, 'growth');
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-semibold">Growth Plan &amp; Strategy</h2><DraftButton dealId={params.id} page="growth" /></div>
      <p className="text-sm text-neutral-500 mb-4">Levers, 100-day plan, org plan, and roll-up fit.</p>
      <MemoEditor dealId={params.id} page="growth" initial={body} placeholder="Growth narrative." />
      <div className="mt-6"><SectionEditor dealId={params.id} page="growth" mode="blocks" labels={BLOCKS} initial={asStrMap((data as { blocks?: unknown }).blocks)} /></div>
    </div>
  );
}
