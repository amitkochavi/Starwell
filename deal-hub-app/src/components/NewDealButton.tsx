'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewDealButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function create() {
    const name = prompt('New deal — project name');
    if (!name) return;
    setBusy(true);
    const res = await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectName: name }) });
    setBusy(false);
    if (res.ok) { const d = await res.json(); router.push(`/deals/${d.id}`); }
    else alert('Failed: ' + (await res.text()));
  }
  return (
    <button onClick={create} disabled={busy} className="bg-ink text-white rounded-md px-4 py-2 text-sm disabled:opacity-50">
      {busy ? 'Creating…' : '+ New deal'}
    </button>
  );
}
