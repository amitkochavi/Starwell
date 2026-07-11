import { prisma } from '@/lib/prisma';
import { getSection, asStrMap } from '@/lib/memo';
import { entryMultiple, marginPct, dash, mult, pct } from '@/lib/finance';
import SectionEditor from '@/components/SectionEditor';
import MemoEditor from '@/components/MemoEditor';
export const dynamic = 'force-dynamic';
const BM = ['EBITDA margin %', 'Gross margin %', 'Recurring %', 'Revenue / employee ($K)', 'Entry multiple (×)'];
export default async function Industry({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  const { body, data } = await getSection(params.id, 'industry');
  if (!deal) return <div>Deal not found.</div>;
  const thisMargin = marginPct(deal.ebitdaM, deal.revenueM);
  const thisEm = entryMultiple(deal.evM, deal.ebitdaM).value;
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Industry Comparison</h2>
      <p className="text-sm text-neutral-500 mb-4">This deal (computed from approved values) vs the editable MSP benchmark set.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">EBITDA margin</div><div className="text-xl font-semibold">{dash(thisMargin, pct)}</div></div>
        <div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">Entry multiple</div><div className="text-xl font-semibold">{dash(thisEm, mult)}</div></div>
      </div>
      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">MSP benchmark set</h3>
      <SectionEditor dealId={params.id} page="industry" mode="terms" cols={2} labels={BM} initial={asStrMap((data as { terms?: unknown }).terms)} />
      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Commentary</h3>
      <MemoEditor dealId={params.id} page="industry" initial={body} placeholder="How this deal compares to the pipeline and MSP benchmarks." />
    </div>
  );
}
