// Import a customer file (B.19). Replaces the deal's cohort dataset.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCustomerFile } from '@/lib/cohort-parse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  const text = await file.text();
  const rows = parseCustomerFile(text);
  if (!rows.length) return NextResponse.json({ error: 'No customer-year rows parsed. Expected columns customer/year/revenue, or a customer column plus one column per year.' }, { status: 422 });

  await prisma.cohortDataset.deleteMany({ where: { dealId: params.id } });
  const ds = await prisma.cohortDataset.create({ data: { dealId: params.id, filename: file.name } });
  await prisma.customerYearRevenue.createMany({ data: rows.map((r) => ({ datasetId: ds.id, customer: r.customer, year: r.year, revenue: r.revenue })) });
  return NextResponse.json({ rows: rows.length, customers: new Set(rows.map((r) => r.customer)).size }, { status: 201 });
}
