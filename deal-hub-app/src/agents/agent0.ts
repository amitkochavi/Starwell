// Agent 0 — Classifier & Completeness (PRD Module C.3).
// Identifies the document type + which checklist item it satisfies, and routes
// CIMs on to Agent 1. Real Anthropic call; PDFs go to Claude natively.
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';
import { readStored, extOf } from '@/lib/storage';

const CHECKLIST_FOR: Record<string, string> = {
  CIM: 'CIM', tax_return: '3y tax returns', customer_file: 'Customer revenue file',
  financials: '3y P&L + balance sheets', NDA: 'NDA', transcript: 'Other',
};

export async function runAgent0(jobId: string): Promise<void> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY not set — pipeline disabled (uploads still store; C.7 / criterion 23).');

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  if (!job.documentId || !job.dealId) throw new Error('Agent 0 job missing documentId/dealId');
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: job.documentId }, include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } } });
  const ver = doc.versions[0];
  if (!ver) throw new Error('No document version to classify');

  const ext = extOf(ver.filename);
  const prompt = loadPrompt('agent-0');
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
  if (ext === 'pdf') {
    const buf = await readStored(ver.storagePath);
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } });
  } else {
    content.push({ type: 'text', text: `\n\n(Document filename: ${ver.filename}; type ${ext}. Classify from the filename.)` });
  }

  const msg = await client.messages.create({ model: MODEL, max_tokens: 1024, temperature: 0, messages: [{ role: 'user', content: content as never }] });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

  const docType: string = parsed.doc_type || 'other';
  await prisma.document.update({ where: { id: doc.id }, data: { type: docType } });

  const itemLabel = parsed.satisfies_checklist_item || CHECKLIST_FOR[docType];
  if (itemLabel) {
    const existing = await prisma.checklistItem.findFirst({ where: { dealId: job.dealId, label: itemLabel } });
    if (existing) await prisma.checklistItem.update({ where: { id: existing.id }, data: { status: 'Received' } });
    else await prisma.checklistItem.create({ data: { dealId: job.dealId, label: itemLabel, status: 'Received' } });
  }

  await prisma.job.update({ where: { id: jobId }, data: { tokens: (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0) } });

  // Chain: a CIM feeds Agent 1 (extraction). Other types stop here in M2.
  if (docType === 'CIM' && ext === 'pdf') {
    await prisma.job.create({ data: { dealId: job.dealId, documentId: doc.id, agent: 'agent1', status: 'queued' } });
  }
}
