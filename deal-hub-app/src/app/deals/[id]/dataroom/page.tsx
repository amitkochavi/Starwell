// Dataroom & Checklist (B.21) — Checklist + Files browser, upload, and the
// "Process all documents" trigger for the AI pipeline.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Uploader from '@/components/Uploader';
import ProcessButton from '@/components/ProcessButton';

export const dynamic = 'force-dynamic';

const CHECKLIST = ['NDA', 'CIM', '3y P&L + balance sheets', '3y tax returns', 'Customer revenue file',
  'Top contracts / MSAs', 'AR aging', 'Org chart & payroll', 'Lease', 'QoE', 'Insurance', 'Other'];

export default async function Dataroom({ params }: { params: { id: string } }) {
  const [deal, docs, checklist, jobs, pending] = await Promise.all([
    prisma.deal.findUnique({ where: { id: params.id } }),
    prisma.document.findMany({ where: { dealId: params.id }, include: { versions: { orderBy: { uploadedAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } }),
    prisma.checklistItem.findMany({ where: { dealId: params.id } }),
    prisma.job.findMany({ where: { dealId: params.id }, orderBy: { createdAt: 'desc' } }),
    prisma.proposedValue.count({ where: { dealId: params.id, status: 'pending' } }),
  ]);
  if (!deal) return <div>Deal not found.</div>;
  const statusOf = (label: string) => checklist.find((c) => c.label === label)?.status || 'Missing';
  const received = CHECKLIST.filter((l) => ['Received', 'Processed'].includes(statusOf(l))).length;
  const jobFor = (docId: string) => jobs.find((j) => j.documentId === docId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={`/deals/${params.id}`} className="text-sm text-accent">← {deal.projectName}</Link>
          <h1 className="text-2xl font-semibold">Dataroom &amp; Checklist</h1>
        </div>
        <div className="flex items-center gap-3">
          {pending > 0 && <Link href={`/deals/${params.id}/review`} className="rounded-md bg-amber-100 text-amber-800 px-3 py-2 text-sm font-medium">{pending} to review →</Link>}
          <Uploader dealId={params.id} />
        </div>
      </div>

      <div className="mb-4"><ProcessButton dealId={params.id} /></div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-sm mb-3">Checklist — {Math.round((received / CHECKLIST.length) * 100)}% complete</h2>
          {CHECKLIST.map((l) => {
            const s = statusOf(l);
            const color = s === 'Received' || s === 'Processed' ? 'text-green-700' : s === 'Requested' ? 'text-amber-700' : 'text-neutral-400';
            return <div key={l} className="flex justify-between py-1.5 border-b last:border-0 text-sm"><span>{l}</span><span className={color}>{s}</span></div>;
          })}
        </section>

        <section className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-sm mb-3">Files ({docs.length})</h2>
          {docs.length === 0 && <div className="text-sm text-neutral-400">No documents yet.</div>}
          {docs.map((d) => {
            const v = d.versions[0];
            const j = jobFor(d.id);
            return (
              <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                <div className="min-w-0">
                  {v ? <a href={`/api/files/${v.id}`} target="_blank" rel="noreferrer" className="text-accent truncate block">{v.filename}</a> : <span>—</span>}
                  <div className="text-[11px] text-neutral-500">{d.type || 'unclassified'} · {v ? (v.sizeBytes / 1024).toFixed(0) + ' KB' : ''}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${j?.status === 'needs_review' ? 'bg-amber-100 text-amber-800' : j?.status === 'failed' ? 'bg-red-100 text-red-700' : j?.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                  {j?.status || 'queued'}
                </span>
              </div>
            );
          })}
          {jobs.some((j) => j.status === 'failed') && (
            <div className="mt-3 text-[11px] text-red-600">Some jobs failed — hover a document’s status or check the worker logs. With no API key, uploads still store and the checklist still works (nothing is fabricated).</div>
          )}
        </section>
      </div>
    </div>
  );
}
