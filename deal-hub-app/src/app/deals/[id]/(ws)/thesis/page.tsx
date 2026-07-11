import { getSection, asStrMap } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import DraftButton from '@/components/DraftButton';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
const BLOCKS = ['Core Thesis', 'Key Pros', 'Key Cons', 'Red Flags', 'Convexity (asymmetry)', 'Main Return Driver', 'Main Downside Risk', 'Data Quality'];
export default async function Thesis({ params }: { params: { id: string } }) {
  const { body, data } = await getSection(params.id, 'thesis');
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-semibold">Investment Thesis</h2><DraftButton dealId={params.id} page="thesis" /></div>
      <p className="text-sm text-neutral-500 mb-4">Synthesis (AI-drafted, cited) plus the structured blocks.</p>
      <MemoEditor dealId={params.id} page="thesis" initial={body} placeholder="Synthesis of the thesis." />
      <div className="mt-6"><SectionEditor dealId={params.id} page="thesis" mode="blocks" labels={BLOCKS} initial={asStrMap((data as { blocks?: unknown }).blocks)} /></div>
    </div>
  );
}
