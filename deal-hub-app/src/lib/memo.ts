// Server helper: load a memo section's body + parsed data.
import { prisma } from './prisma';

export async function getSection(dealId: string, page: string): Promise<{ body: string; data: Record<string, unknown> }> {
  const s = await prisma.memoSection.findFirst({ where: { dealId, page } });
  let data: Record<string, unknown> = {};
  try { data = s?.data ? JSON.parse(s.data) : {}; } catch { data = {}; }
  return { body: s?.body || '', data };
}
export function asStrMap(v: unknown): Record<string, string> {
  return (v && typeof v === 'object') ? (v as Record<string, string>) : {};
}
