import { getSection } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
export const dynamic = 'force-dynamic';
export default async function Extras({ params }: { params: { id: string } }) {
  const { body } = await getSection(params.id, 'extras');
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Memo Extras</h2>
      <p className="text-sm text-neutral-500 mb-4">Free-form appendix — pinned analyses, extra tables, pasted exhibits.</p>
      <MemoEditor dealId={params.id} page="extras" initial={body} placeholder="Anything that should live with the memo but doesn't fit the structured pages." />
    </div>
  );
}
