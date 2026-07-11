import { NextResponse } from 'next/server';
import { draftSection } from '@/agents/agent3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { page } = await req.json() as { page: string };
  const res = await draftSection(params.id, page);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
