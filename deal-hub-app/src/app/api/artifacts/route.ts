// Artifact Library (Module F) — items we produce (deck, strategy, thesis, memos).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await prisma.artifactItem.findMany({ orderBy: { createdAt: 'desc' } }));
}
export async function POST(req: Request) {
  const b = await req.json() as { title: string; category: string; status?: string; externalUrl?: string; notes?: string; tags?: string[] };
  if (!b.title || !b.category) return NextResponse.json({ error: 'title + category required' }, { status: 400 });
  const item = await prisma.artifactItem.create({ data: { title: b.title, category: b.category, status: b.status || 'Draft', externalUrl: b.externalUrl || null, notes: b.notes || null, tags: JSON.stringify(b.tags || []) } });
  return NextResponse.json(item, { status: 201 });
}
