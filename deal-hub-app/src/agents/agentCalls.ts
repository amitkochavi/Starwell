// Calls Agent (B.16). Summarises a transcript -> summary/participants/key facts/
// follow-ups/flags, stored in MemoSection('calls').data.calls[]. Real Anthropic.
import { prisma } from '@/lib/prisma';
import { anthropic, MODEL, loadPrompt } from '@/lib/anthropic';

export async function summariseCall(dealId: string, transcript: string, title: string): Promise<{ ok: boolean; error?: string }> {
  const client = anthropic();
  if (!client) return { ok: false, error: 'ANTHROPIC_API_KEY not set — call summarisation disabled.' };
  if (!transcript.trim()) return { ok: false, error: 'Empty transcript.' };
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 1500, temperature: 0,
    messages: [{ role: 'user', content: `${loadPrompt('calls')}\n\nTRANSCRIPT:\n${transcript.slice(0, 60000)}` }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

  const sec = await prisma.memoSection.findFirst({ where: { dealId, page: 'calls' } });
  let calls: unknown[] = [];
  try { calls = sec?.data ? (JSON.parse(sec.data).calls || []) : []; } catch { calls = []; }
  calls.unshift({ title, at: new Date().toISOString(), ...parsed });
  await prisma.memoSection.upsert({
    where: { dealId_page_version: { dealId, page: 'calls', version: 1 } },
    update: { data: JSON.stringify({ calls }), generatedAt: new Date() },
    create: { dealId, page: 'calls', version: 1, data: JSON.stringify({ calls }) },
  });

  // new flags -> RiskItem (feeds Flag Tally)
  for (const f of (parsed.newFlags || []) as { severity: string; note: string }[]) {
    if (['Red', 'Yellow', 'Green'].includes(f.severity)) await prisma.riskItem.create({ data: { dealId, severity: f.severity, risk: f.note, evidence: `Call: ${title}`, status: 'Open' } });
  }
  return { ok: true };
}
