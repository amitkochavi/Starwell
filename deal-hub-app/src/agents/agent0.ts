// Agent 0 — Classifier & Completeness (PRD Module C.3). Identifies the document
// type, which checklist item it satisfies, and whether it's complete.
// Stub: wire the Anthropic call in M2 (first end-to-end AI loop).
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';

export async function runAgent0(jobId: string): Promise<void> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY not set — pipeline disabled (uploads still store; C.7 / criterion 23).');
  const _prompt = loadPrompt('agent-0'); // eslint-disable-line @typescript-eslint/no-unused-vars
  // M2: read the document, call `client.messages.create({ model: MODEL, temperature: 0, ... })`,
  // update the ChecklistItem, and route to Agent 1. Model id: ${MODEL}.
  void MODEL;
  throw new Error('Agent 0 not yet implemented — scaffold. Build in M2.');
  void prisma;
}
