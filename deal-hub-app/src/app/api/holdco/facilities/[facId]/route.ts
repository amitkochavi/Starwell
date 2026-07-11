import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function DELETE(_: Request, { params }: { params: { facId: string } }) {
  await prisma.holdCoFacility.delete({ where: { id: params.facId } });
  return NextResponse.json({ ok: true });
}
