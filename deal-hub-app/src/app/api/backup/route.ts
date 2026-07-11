// One-click JSON backup (PRD §H). Dumps all tables.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
  const [deals, documents, versions, proposals, memos, scores, risks, crossChecks, lbo, cohorts, cohortRows, checklist, artifacts] = await Promise.all([
    prisma.deal.findMany(), prisma.document.findMany(), prisma.documentVersion.findMany(), prisma.proposedValue.findMany(),
    prisma.memoSection.findMany(), prisma.scoreEntry.findMany(), prisma.riskItem.findMany(), prisma.crossCheckEntry.findMany(),
    prisma.lboScenario.findMany(), prisma.cohortDataset.findMany(), prisma.customerYearRevenue.findMany(), prisma.checklistItem.findMany(), prisma.artifactItem.findMany(),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), deals, documents, versions, proposals, memos, scores, risks, crossChecks, lbo, cohorts, cohortRows, checklist, artifacts }, null, 2);
  return new NextResponse(body, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="starwell-deal-hub-backup.json"' } });
}
