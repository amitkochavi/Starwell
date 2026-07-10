// Review screen (C.4) — proposed values next to their citation snippet; Amit or
// Tal Accept / Edit / Reject each. On Accept the value becomes canonical with
// provenance and Agent 2 (M3) recomputes downstream.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CIM_FIELDS } from '@/lib/extract-schema';
import ReviewList, { type Proposal } from '@/components/ReviewList';

export const dynamic = 'force-dynamic';

export default async function Review({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  const raw = await prisma.proposedValue.findMany({
    where: { dealId: params.id, status: 'pending' },
    include: { document: { include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } } } },
    orderBy: { createdAt: 'asc' },
  });
  const proposals: Proposal[] = raw.map((p) => ({
    id: p.id, field: p.field,
    label: CIM_FIELDS[p.field]?.label || p.field,
    kind: CIM_FIELDS[p.field]?.kind || 'text',
    value: p.value == null ? null : JSON.parse(p.value),
    snippet: p.snippet, citationLocator: p.citationLocator, confidence: p.confidence,
    versionId: p.document?.versions[0]?.id || null,
  }));

  return (
    <div className="max-w-3xl">
      <Link href={`/deals/${params.id}/dataroom`} className="text-sm text-accent">← Dataroom</Link>
      <h1 className="text-2xl font-semibold mb-1">Review — {deal?.projectName}</h1>
      <p className="text-sm text-neutral-500 mb-5">Nothing is canonical until you accept it. Accepting writes the value to the deal with its citation and adds a Cross-Check row.</p>
      <ReviewList proposals={proposals} />
    </div>
  );
}
