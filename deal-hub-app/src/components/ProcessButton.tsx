'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProcessButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function run() {
    setBusy(true); setMsg('Running Agent 0 → Agent 1…');
    const res = await fetch(`/api/deals/${dealId}/process`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Processed ${j.processed} job(s). Check the Review screen.` : `Error: ${j.error || res.statusText}`);
    router.refresh();
  }
  return (
    <div className="inline-flex items-center gap-3">
      <button onClick={run} disabled={busy} className="rounded-md bg-accent text-white px-4 py-2 text-sm disabled:opacity-50">
        {busy ? 'Processing…' : 'Process all documents'}
      </button>
      {msg && <span className="text-xs text-neutral-500">{msg}</span>}
    </div>
  );
}
