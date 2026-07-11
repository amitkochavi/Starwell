// Tax Return Analyst mini-agent (PRD C.3 / B.15). Real Anthropic call: extracts
// the per-year income statement from a tax return, writes it to MemoSection('tax'),
// and files a Cross-Check Discrepancy when it contradicts the approved CIM figures
// (criterion 16).
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';
import { readStored, extOf } from '@/lib/storage';
import { validateAgainstCim, type TaxData } from '@/lib/tax';

export async function runAgentTax(jobId: string): Promise<void> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY not set — pipeline disabled.');
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  if (!job.documentId || !job.dealId) throw new Error('tax job missing documentId/dealId');
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: job.documentId }, include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } } });
  const ver = doc.versions[0];
  if (!ver || extOf(ver.filename) !== 'pdf') throw new Error('Tax Return Analyst handles PDF returns only');

  const buf = await readStored(ver.storagePath);
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 3072, temperature: 0,
    messages: [{ role: 'user', content: [
      { type: 'text', text: loadPrompt('tax-analyst') },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } },
    ] as never }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const data: TaxData = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

  await prisma.memoSection.upsert({
    where: { dealId_page_version: { dealId: job.dealId, page: 'tax', version: 1 } },
    update: { body: null, data: JSON.stringify(data), model: MODEL, generatedAt: new Date() },
    create: { dealId: job.dealId, page: 'tax', version: 1, data: JSON.stringify(data), model: MODEL },
  });

  const deal = await prisma.deal.findUnique({ where: { id: job.dealId } });
  const latest = (data.years || []).slice(-1)[0];
  if (deal && latest) {
    for (const d of validateAgainstCim(latest, deal.revenueM, deal.ebitdaM)) {
      const ex = await prisma.crossCheckEntry.findFirst({ where: { dealId: job.dealId, figure: d.figure } });
      if (ex) await prisma.crossCheckEntry.update({ where: { id: ex.id }, data: { status: 'Discrepancy', detail: d.detail, method: 'Extracted', source: `${ver.filename}` } });
      else await prisma.crossCheckEntry.create({ data: { dealId: job.dealId, figure: d.figure, appearsAt: 'Tax Returns', method: 'Extracted', source: ver.filename, status: 'Discrepancy', detail: d.detail } });
    }
  }
}
