'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Agent 3A/3B — draft this section from the CIM, cited (criterion 24).
export default function DraftButton({ dealId, page }: { dealId: string; page: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function draft() {
    setBusy(true); setMsg('Drafting from the CIM…');
    const res = await fetch(`/api/deals/${dealId}/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false); setMsg(res.ok ? 'Drafted ✓' : (j.error || 'Error'));
    if (res.ok) router.refresh();
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={draft} disabled={busy} className="text-xs rounded-md border border-accent text-accent px-2.5 py-1 disabled:opacity-50">✨ {busy ? 'Drafting…' : 'Draft with AI'}</button>
      {msg && <span className="text-[11px] text-neutral-500">{msg}</span>}
    </span>
  );
}
