import { getSection, asStrMap } from '@/lib/memo';
import MemoEditor from '@/components/MemoEditor';
import DraftButton from '@/components/DraftButton';
import SectionEditor from '@/components/SectionEditor';
export const dynamic = 'force-dynamic';
const TERMS = ['MRR ($M)', 'ARR ($M)', 'Recurring % (stated)', 'Recurring % (computed)', 'Managed clients on contract', 'Avg contract length (mo)', 'Top-1 customer %', 'Top-5 customers %'];
export default async function RevenueMix({ params }: { params: { id: string } }) {
  const { body, data } = await getSection(params.id, 'revenue-mix');
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-semibold">Revenue Mix &amp; Customers</h2><DraftButton dealId={params.id} page="revenue-mix" /></div>
      <p className="text-sm text-neutral-500 mb-4">Service-line split, recurring revenue, contract base, concentration.</p>
      <MemoEditor dealId={params.id} page="revenue-mix" initial={body} placeholder="Revenue-mix narrative." />
      <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Recurring &amp; concentration</h3>
      <SectionEditor dealId={params.id} page="revenue-mix" mode="terms" cols={2} labels={TERMS} initial={asStrMap((data as { terms?: unknown }).terms)} />
    </div>
  );
}
