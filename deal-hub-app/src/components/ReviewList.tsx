'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Proposal {
  id: string; field: string; label: string; kind: string;
  value: string | number | null; snippet: string | null; citationLocator: string | null;
  confidence: string | null; versionId: string | null;
}

export default function ReviewList({ proposals }: { proposals: Proposal[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(p: Proposal, action: 'accept' | 'reject', value?: unknown) {
    setBusy(p.id);
    await fetch(`/api/proposals/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, value, reviewedBy: 'amit@kochavii.com' }),
    });
    setBusy(null);
    router.refresh();
  }

  if (!proposals.length) return <div className="text-sm text-neutral-500">No proposed values pending review. Upload a CIM and click “Process all documents” on the Dataroom.</div>;

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <div key={p.id} className="bg-white border rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{p.label}
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${p.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.confidence}</span>
              </div>
              <div className="text-lg font-semibold mt-1">{p.value == null ? '—' : String(p.value)}{p.kind === 'money' && p.value != null ? ' $M' : ''}</div>
              {p.snippet && <blockquote className="mt-2 text-xs text-neutral-600 border-l-2 pl-3 italic">“{p.snippet}”</blockquote>}
              <div className="mt-1 text-[11px] text-neutral-400">
                cited: {p.citationLocator || '—'}
                {p.versionId && p.citationLocator?.startsWith('page:') && (
                  <a className="ml-2 text-accent" target="_blank" rel="noreferrer"
                     href={`/api/files/${p.versionId}#page=${p.citationLocator.split(':')[1]}`}>open at page →</a>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button disabled={busy === p.id} onClick={() => act(p, 'accept')} className="rounded-md bg-green-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">Accept</button>
              <button disabled={busy === p.id} onClick={() => { const v = prompt('Edit value then accept', p.value == null ? '' : String(p.value)); if (v !== null) act(p, 'accept', p.kind === 'money' ? Number(v) : v); }} className="rounded-md border px-3 py-1.5 text-sm">Edit</button>
              <button disabled={busy === p.id} onClick={() => act(p, 'reject')} className="rounded-md border border-red-200 text-red-600 px-3 py-1.5 text-sm">Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
