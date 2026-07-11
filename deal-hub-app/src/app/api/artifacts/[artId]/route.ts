import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function PATCH(req: Request, { params }: { params: { artId: string } }) {
  const b = await req.json();
  const item = await prisma.artifactItem.update({ where: { id: params.artId }, data: b });
  return NextResponse.json(item);
}
export async function DELETE(_: Request, { params }: { params: { artId: string } }) {
  await prisma.artifactItem.delete({ where: { id: params.artId } });
  return NextResponse.json({ ok: true });
}
