'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Call { title: string; at: string; summary?: string; participants?: string[]; keyFacts?: { fact: string; timestamp?: string }[]; followUps?: string[] }

export default function CallsEditor({ dealId, calls }: { dealId: string; calls: Call[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(''); const [tx, setTx] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  async function run() {
    if (!tx.trim()) return; setBusy(true); setMsg('Summarising…');
    const res = await fetch(`/api/deals/${dealId}/calls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: tx, title: title || 'Call' }) });
    const j = await res.json().catch(() => ({})); setBusy(false);
    setMsg(res.ok ? 'Summarised ✓' : (j.error || 'Error'));
    if (res.ok) { setTx(''); setTitle(''); router.refresh(); }
  }
  return (
    <div>
      <div className="border rounded-lg p-3 mb-5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call title (e.g. Founder call — Aug 12)" className="border rounded-md px-2 py-1.5 text-sm w-full mb-2" />
        <textarea value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Paste transcript here…" className="border rounded-md px-2 py-2 text-sm w-full min-h-[120px]" />
        <div className="flex items-center gap-3 mt-2"><button onClick={run} disabled={busy} className="bg-accent text-white rounded-md px-4 py-1.5 text-sm disabled:opacity-50">✨ Summarise call</button><span className="text-xs text-neutral-500">{msg}</span></div>
      </div>
      {calls.length === 0 && <div className="text-sm text-neutral-400">No calls summarised yet.</div>}
      {calls.map((c, i) => (
        <div key={i} className="border rounded-lg p-4 mb-3">
          <div className="flex items-baseline justify-between"><div className="font-medium text-sm">{c.title}</div><div className="text-xs text-neutral-400">{c.at?.slice(0, 10)}</div></div>
          {c.participants?.length ? <div className="text-[11px] text-neutral-500 mt-0.5">{c.participants.join(' · ')}</div> : null}
          {c.summary && <p className="text-sm mt-2">{c.summary}</p>}
          {c.keyFacts?.length ? <div className="mt-2"><div className="text-[11px] uppercase text-neutral-400">Key facts</div><ul className="text-sm list-disc pl-5">{c.keyFacts.map((f, j) => <li key={j}>{f.fact}{f.timestamp ? <span className="text-neutral-400"> ({f.timestamp})</span> : null}</li>)}</ul></div> : null}
          {c.followUps?.length ? <div className="mt-2"><div className="text-[11px] uppercase text-neutral-400">Follow-ups</div><ul className="text-sm list-disc pl-5">{c.followUps.map((f, j) => <li key={j}>{f}</li>)}</ul></div> : null}
        </div>
      ))}
    </div>
  );
}
