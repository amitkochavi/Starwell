import { prisma } from '@/lib/prisma';
import ArtifactManager, { type Artifact } from '@/components/ArtifactManager';
export const dynamic = 'force-dynamic';
export default async function Artifacts() {
  const items = await prisma.artifactItem.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Artifact Library</h1>
      <p className="text-sm text-neutral-500 mb-5">Documents we produce — HoldCo deck, strategy, thesis, OpCo materials, templates, deal memos.</p>
      <ArtifactManager items={items as Artifact[]} />
    </div>
  );
}
