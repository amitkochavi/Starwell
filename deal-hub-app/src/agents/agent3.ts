// Agent 3A (quantitative narrative) / 3B (qualitative drafts) — PRD C.3.
// Drafts a memo section from the deal's CIM + approved values, with inline
// citations, into MemoSection(page).body. Real Anthropic call.
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';
import { readStored, extOf } from '@/lib/storage';

const PAGE_BRIEF: Record<string, string> = {
  market: 'Market: geography and service-area, local MSP competitive density, verticals served, demand drivers, pricing environment.',
  thesis: 'Investment Thesis: Core Thesis, Key Pros, Key Cons, Red Flags, Convexity, Main Return Driver, Main Downside Risk, Data Quality.',
  'revenue-mix': 'Revenue Mix & Customers: service-line split, recurring revenue (MRR/ARR), contract base, customer concentration.',
  growth: 'Growth Plan & Strategy: growth levers (pricing, cross-sell, new contracts, tuck-ins), 100-day plan, org plan, roll-up fit.',
  'financials-narrative': 'Financials narrative: earnings quality, volatility, margin story, cash conversion, leverage implications.',
};

export async function draftSection(dealId: string, page: string): Promise<{ ok: boolean; error?: string }> {
  const client = anthropic();
  if (!client) return { ok: false, error: 'ANTHROPIC_API_KEY not set — drafting disabled (nothing fabricated).' };
  const brief = PAGE_BRIEF[page];
  if (!brief) return { ok: false, error: `No drafting brief for "${page}".` };

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  // most-recent CIM document for grounding
  const cim = await prisma.document.findFirst({ where: { dealId, type: 'CIM' }, include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
  const ver = cim?.versions[0];
  if (!ver || extOf(ver.filename) !== 'pdf') return { ok: false, error: 'No processed CIM PDF to ground the draft. Upload + Process a CIM first.' };

  const approved = deal ? `Approved values — Revenue $${deal.revenueM ?? '—'}M, EBITDA $${deal.ebitdaM ?? '—'}M, EV $${deal.evM ?? '—'}M.` : '';
  const buf = await readStored(ver.storagePath);
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 1600, temperature: 0.2,
    messages: [{ role: 'user', content: [
      { type: 'text', text: `${loadPrompt('agent-3')}\n\nSection to draft — ${brief}\n${approved}` },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } },
    ] as never }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim();

  await prisma.memoSection.upsert({
    where: { dealId_page_version: { dealId, page, version: 1 } },
    update: { body: text, model: MODEL, promptVersion: 'agent-3/v1', generatedAt: new Date() },
    create: { dealId, page, version: 1, body: text, model: MODEL, promptVersion: 'agent-3/v1' },
  });
  return { ok: true };
}
