// Server-side Anthropic client (PRD Module C.6). The API key lives in env and
// NEVER reaches the browser. Extraction runs at temperature 0; long documents
// are chunked by section with page offsets preserved so citations stay accurate.
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;
export function anthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null; // graceful: pipeline fails visibly, never fabricates (C.7 / criterion 23)
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

import { readFileSync } from 'fs';
import { join } from 'path';
/** Prompts are versioned in-repo under /prompts/<agent>/<version>.md (C.6/§H). */
export function loadPrompt(agent: string, version = 'v1'): string {
  return readFileSync(join(process.cwd(), 'prompts', agent, `${version}.md`), 'utf8');
}
