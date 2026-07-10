// Upload (C.1) + list documents for a deal. SHA-256 dedupe (criterion 30);
// every upload creates a Document + DocumentVersion and enqueues Agent 0.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storeDealFile, sha256 } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const docs = await prisma.document.findMany({
    where: { dealId: params.id },
    include: { versions: { orderBy: { uploadedAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(docs);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get('file');
  const uploadedBy = (form.get('uploadedBy') as string) || 'unknown';
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'max 50 MB per file (C.1)' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const sha = sha256(buf);

  // Duplicate protection: byte-identical file already on THIS deal is blocked.
  const dup = await prisma.documentVersion.findFirst({
    where: { sha256: sha, document: { dealId: params.id } },
  });
  if (dup) return NextResponse.json({ error: `Identical file already uploaded (${dup.filename}) on ${dup.uploadedAt.toISOString().slice(0, 10)}`, duplicate: true }, { status: 409 });

  const stored = await storeDealFile(params.id, file.name, buf);
  const doc = await prisma.document.create({ data: { dealId: params.id } });
  const ver = await prisma.documentVersion.create({
    data: { documentId: doc.id, sha256: stored.sha, filename: file.name, sizeBytes: stored.size, storagePath: stored.path, uploadedBy },
  });
  await prisma.document.update({ where: { id: doc.id }, data: { currentVersionId: ver.id } });

  // queue Agent 0 (classify → route). Uploads always store even if the key is
  // absent; the job just fails visibly (criterion 23).
  await prisma.job.create({ data: { dealId: params.id, documentId: doc.id, agent: 'agent0', status: 'queued' } });

  return NextResponse.json({ document: doc, version: ver }, { status: 201 });
}
