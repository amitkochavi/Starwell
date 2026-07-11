import { getSection, asStrMap } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
export default async function Exit({ params }: { params: { id: string } }) {
  const { body, data } = await getSection(params.id, 'exit');
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Exit Path</h2>
      <p className="text-sm text-neutral-500 mb-4">Exit options, assumed exit-multiple range and hold period (the LBO page uses these).</p>
      <SectionEditor dealId={params.id} page="exit" mode="terms" cols={4} labels={['Exit multiple — low (×)', 'Exit multiple — base (×)', 'Exit multiple — high (×)', 'Hold period (yrs)']} initial={asStrMap((data as { terms?: unknown }).terms)} />
      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Exit options &amp; rationale</h3>
      <MemoEditor dealId={params.id} page="exit" initial={body} placeholder="Strategic sale · PE roll-up · recap — with rationale." />
    </div>
  );
}
