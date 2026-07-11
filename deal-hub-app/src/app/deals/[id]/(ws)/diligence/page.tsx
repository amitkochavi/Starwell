import { getSection } from '@/lib/memo';
import DiligenceEditor from '@/components/DiligenceEditor';
export const dynamic = 'force-dynamic';
export default async function Diligence({ params }: { params: { id: string } }) {
  const { data } = await getSection(params.id, 'diligence');
  const questions = Array.isArray((data as { questions?: unknown }).questions) ? (data as { questions: { q: string; status: string; answer: string }[] }).questions : [];
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Diligence Qs</h2>
      <p className="text-sm text-neutral-500 mb-4">Living question list — Open / Sent / Answered; copy all open for broker emails.</p>
      <DiligenceEditor dealId={params.id} initial={questions} />
    </div>
  );
}
