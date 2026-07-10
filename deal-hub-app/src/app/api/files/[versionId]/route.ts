// Authenticated file serving (C.9): read a stored document version from disk.
// No public URLs — served through app routes only.
import { prisma } from '@/lib/prisma';
import { readStored, mimeFor } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { versionId: string } }) {
  const ver = await prisma.documentVersion.findUnique({ where: { id: params.versionId } });
  if (!ver) return new Response('not found', { status: 404 });
  const buf = await readStored(ver.storagePath);
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': mimeFor(ver.filename), 'Content-Disposition': `inline; filename="${ver.filename}"` },
  });
}
