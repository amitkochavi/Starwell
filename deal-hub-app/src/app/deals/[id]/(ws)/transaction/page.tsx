import { getSection, asStrMap } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
const SU = ['Term loan / SBA 7(a) ($M)', 'Seller note ($M)', 'Deferred / earnout ($M)', 'Rollover equity ($M)', 'Common equity ($M)', 'Cash at close ($M)', 'Fees ($M)'];
export default async function Transaction({ params }: { params: { id: string } }) {
  const { body, data } = await getSection(params.id, 'transaction');
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Transaction</h2>
      <p className="text-sm text-neutral-500 mb-4">Sources &amp; Uses and structure. Seller notes / earnouts stay modeled at the deal even when senior debt is a HoldCo draw.</p>
      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Sources &amp; Uses</h3>
      <SectionEditor dealId={params.id} page="transaction" mode="terms" cols={2} labels={SU} initial={asStrMap((data as { terms?: unknown }).terms)} />
      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Structure summary</h3>
      <MemoEditor dealId={params.id} page="transaction" initial={body} placeholder="Price, implied multiples, working-capital peg, escrow / holdback." />
    </div>
  );
}
