'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Risk { id: string; severity: string; risk: string; mitigant: string | null; owner: string | null; status: string }
const SEV = ['Red', 'Yellow', 'Green'];
const dot = (s: string) => (s === 'Red' ? 'bg-red-500' : s === 'Yellow' ? 'bg-amber-500' : 'bg-green-500');

export default function RisksEditor({ dealId, risks }: { dealId: string; risks: Risk[] }) {
  const router = useRouter();
  const [sev, setSev] = useState('Yellow');
  const [risk, setRisk] = useState('');
  const [mit, setMit] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!risk.trim()) return;
    setBusy(true);
    await fetch(`/api/deals/${dealId}/risks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ severity: sev, risk, mitigant: mit }) });
    setBusy(false); setRisk(''); setMit(''); router.refresh();
  }
  async function del(id: string) { await fetch(`/api/deals/${dealId}/risks?rid=${id}`, { method: 'DELETE' }); router.refresh(); }

  const tally = { Red: 0, Yellow: 0, Green: 0 } as Record<string, number>;
  risks.forEach((r) => { if (tally[r.severity] != null) tally[r.severity]++; });

  return (
    <div>
      <div className="flex gap-6 mb-4">
        {SEV.map((s) => <div key={s} className="text-sm"><b className="block text-xl">{tally[s]}</b><span className="inline-flex items-center gap-1"><i className={`w-2 h-2 rounded-full inline-block ${dot(s)}`} />{s}</span></div>)}
      </div>
      <table className="w-full text-sm border-collapse mb-4">
        <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
          <tr>{['Sev', 'Risk', 'Mitigant', 'Status', ''].map((h) => <th key={h} className="p-2 border-b text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {risks.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-neutral-400">No risks logged.</td></tr>}
          {risks.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="p-2"><span className={`w-2.5 h-2.5 rounded-full inline-block ${dot(r.severity)}`} /></td>
              <td className="p-2">{r.risk}</td>
              <td className="p-2 text-neutral-600">{r.mitigant || '—'}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2"><button onClick={() => del(r.id)} className="text-red-500 text-xs">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 items-start flex-wrap border-t pt-3">
        <select value={sev} onChange={(e) => setSev(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">{SEV.map((s) => <option key={s}>{s}</option>)}</select>
        <input value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="Risk description" className="border rounded-md px-2 py-1.5 text-sm flex-1 min-w-[200px]" />
        <input value={mit} onChange={(e) => setMit(e.target.value)} placeholder="Mitigant" className="border rounded-md px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
        <button onClick={add} disabled={busy} className="bg-ink text-white rounded-md px-4 py-1.5 text-sm disabled:opacity-50">Add</button>
      </div>
    </div>
  );
}
