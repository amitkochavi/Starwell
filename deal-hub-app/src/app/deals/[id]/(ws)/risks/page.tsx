import { prisma } from '@/lib/prisma';
import RisksEditor, { type Risk } from '@/components/RisksEditor';
export const dynamic = 'force-dynamic';
export default async function Risks({ params }: { params: { id: string } }) {
  const risks = await prisma.riskItem.findMany({ where: { dealId: params.id }, orderBy: { severity: 'asc' } });
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Risks &amp; Mitigants</h2>
      <p className="text-sm text-neutral-500 mb-4">The stop register that feeds the Executive Summary Flag Tally.</p>
      <RisksEditor dealId={params.id} risks={risks as Risk[]} />
    </div>
  );
}
