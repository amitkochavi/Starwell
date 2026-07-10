import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deals = await prisma.deal.findMany({ orderBy: { dateOfEntry: 'desc' } });
  return NextResponse.json(deals);
}

const NewDeal = z.object({
  projectName: z.string().min(1),
  dealLead: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = NewDeal.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const deal = await prisma.deal.create({ data: parsed.data });
  return NextResponse.json(deal, { status: 201 });
}
