import { NextResponse } from 'next/server';
import { summariseCall } from '@/agents/agentCalls';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { transcript, title } = await req.json() as { transcript: string; title: string };
  const res = await summariseCall(params.id, transcript, title || 'Call');
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
