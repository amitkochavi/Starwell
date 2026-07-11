import { getSection } from '@/lib/memo';
import CallsEditor from '@/components/CallsEditor';
export const dynamic = 'force-dynamic';
export default async function Calls({ params }: { params: { id: string } }) {
  const { data } = await getSection(params.id, 'calls');
  const calls = Array.isArray((data as { calls?: unknown }).calls) ? (data as { calls: [] }).calls : [];
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Call Summaries</h2>
      <p className="text-sm text-neutral-500 mb-4">Paste a transcript → summary, participants, key facts, follow-ups; new flags roll up to Risks.</p>
      <CallsEditor dealId={params.id} calls={calls} />
    </div>
  );
}
