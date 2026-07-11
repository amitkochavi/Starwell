'use client';
import { useState } from 'react';

export default function OnePagerActions({ dealId, title }: { dealId: string; title: string }) {
  const [msg, setMsg] = useState('');
  async function toLibrary() {
    setMsg('Filing…');
    const res = await fetch('/api/artifacts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${title} — one-pager`, category: 'Deal memos', status: 'Final', externalUrl: `/deals/${dealId}/one-pager` }) });
    setMsg(res.ok ? 'Filed under Artifact Library → Deal memos ✓' : 'Error');
  }
  return (
    <div className="no-print flex items-center gap-3 mb-4">
      <button onClick={() => window.print()} className="bg-ink text-white rounded-md px-4 py-2 text-sm">Print / Save as PDF</button>
      <button onClick={toLibrary} className="border rounded-md px-4 py-2 text-sm">File in Artifact Library</button>
      <span className="text-xs text-neutral-500">{msg}</span>
    </div>
  );
}
