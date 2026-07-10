// Agent 1 — Extraction (PRD Module C.3/C.4). Returns structured JSON against the
// field schema, EVERY value with a citation {page, snippet}. Writes *proposed*
// values (never canonical). Unknown = null; never infer a number (C.7). Any output
// failing JSON-schema validation is retried once, then the job goes to needs_review
// with the raw output attached.
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';
import { readStored, extOf } from '@/lib/storage';
import { ExtractionSchema, CIM_FIELDS, FIELD_LIST, type Extraction } from '@/lib/extract-schema';

export async function runAgent1(jobId: string): Promise<void> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY not set — pipeline disabled.');

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  if (!job.documentId || !job.dealId) throw new Error('Agent 1 job missing documentId/dealId');
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: job.documentId }, include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } } });
  const ver = doc.versions[0];
  if (!ver) throw new Error('No document version to extract');
  if (extOf(ver.filename) !== 'pdf') throw new Error('Agent 1 (M2) handles PDF CIMs only');

  const buf = await readStored(ver.storagePath);
  const prompt = loadPrompt('agent-1') + '\n\nFields to extract (omit any not stated; value=null if unknown):\n' + FIELD_LIST;

  async function call(): Promise<Extraction> {
    const msg = await client!.messages.create({
      model: MODEL, max_tokens: 2048, temperature: 0,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } },
      ] as never }],
    });
    const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return ExtractionSchema.parse(json);
  }

  let extraction: Extraction;
  try { extraction = await call(); }
  catch { extraction = await call(); } // retry once on schema/JSON failure

  // Write proposed values (pending) — never canonical. Only known fields.
  const valid = extraction.values.filter((v) => CIM_FIELDS[v.field]);
  for (const v of valid) {
    await prisma.proposedValue.create({
      data: {
        dealId: job.dealId, documentId: doc.id, field: v.field,
        value: v.value == null ? null : JSON.stringify(v.value),
        citationLocator: `${v.citation.locator_type}:${v.citation.locator_value}`,
        snippet: v.citation.snippet, confidence: v.confidence, status: 'pending',
      },
    });
  }
}
