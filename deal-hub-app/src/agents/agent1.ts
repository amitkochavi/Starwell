// Agent 1 — Extraction (PRD Module C.3/C.4). Returns structured JSON against the
// field schema, EVERY value with a citation {doc_id, page, snippet}. Writes
// *proposed* values (never canonical). Unknown = null; never infer a number (C.7).
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';

export async function runAgent1(jobId: string): Promise<void> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY not set — pipeline disabled.');
  const _prompt = loadPrompt('agent-1'); // eslint-disable-line @typescript-eslint/no-unused-vars
  // M2: extract with temperature 0, validate against the Zod schema, retry once on
  // schema failure, then write ProposedValue rows (status "pending") for human review.
  void MODEL; void prisma;
  throw new Error('Agent 1 not yet implemented — scaffold. Build in M2.');
}
