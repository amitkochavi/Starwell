'use client';
// HC.5 Pro-forma HoldCo test — does adding THIS deal (its EBITDA, plus new HoldCo
// draw) keep the consolidated group inside covenant? Deterministic; no AI.
import { useState } from 'react';

const money = (n: number | null) => (n == null ? '—' : '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M');
const mult = (n: number | null) => (n == null ? '—' : n.toFixed(2) + '×');

export default function HoldCoTestButton({ dealId }: { dealId: string }) {
  const [addDraw, setAddDraw] = useState('0');
  const [rateBps, setRateBps] = useState('700');
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setErr(''); setRes(null);
    const r = await fetch('/api/holdco/test', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, addDraw: Number(addDraw) || 0, rateBps: Number(rateBps) || 0 }) });
    const j = await r.json();
    if (!r.ok) setErr(j.error || 'Test failed'); else setRes(j);
    setBusy(false);
  }

  return (
    <div className="border rounded-lg p-4 mt-6">
      <h3 className="text-sm font-semibold mb-1">HoldCo pro-forma test <span className="text-[9px] bg-blue-50 text-accent rounded px-1">CALC</span></h3>
      <p className="text-xs text-neutral-500 mb-3">Adds this deal to the consolidated HoldCo group (its EBITDA + a new draw) and checks group covenants.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="block text-[10px] uppercase text-neutral-500 mb-0.5">New HoldCo draw ($M)</span>
          <input value={addDraw} onChange={(e) => setAddDraw(e.target.value)} className="w-28 border rounded-md px-2 py-1 text-sm text-right" /></label>
        <label className="text-sm"><span className="block text-[10px] uppercase text-neutral-500 mb-0.5">Rate on draw (bps)</span>
          <input value={rateBps} onChange={(e) => setRateBps(e.target.value)} className="w-28 border rounded-md px-2 py-1 text-sm text-right" /></label>
        <button onClick={run} disabled={busy} className="bg-ink text-white rounded-md px-4 py-1.5 text-sm disabled:opacity-40">{busy ? 'Testing…' : 'Run test'}</button>
      </div>
      {err && <div className="text-sm text-red-600 mt-3">{err}</div>}
      {res && (
        <div className="mt-4">
          <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${res.verdict === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Pro-forma {res.verdict === 'pass' ? 'PASS — within covenant' : 'BREACH — exceeds covenant'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <K l="Pro-forma leverage" v={mult(res.pro.leverage)} />
            <K l="Pro-forma DSCR" v={mult(res.pro.dscr)} />
            <K l="Group EBITDA" v={money(res.pro.ebitda)} />
            <K l="Group net debt" v={money(res.pro.netDebt)} />
            <K l="Max-lev covenant" v={mult(res.pro.covMaxLev)} />
            <K l="Min-DSCR covenant" v={mult(res.pro.covMinDSCR)} />
            <K l="Remaining capacity" v={money(res.pro.capacity)} />
            <K l="Capacity used" v={res.capacityUsedPct == null ? '—' : res.capacityUsedPct.toFixed(0) + '%'} />
          </div>
        </div>
      )}
    </div>
  );
}
function K({ l, v }: { l: string; v: string }) {
  return (<div className="border rounded-lg p-2.5"><div className="text-[10px] uppercase text-neutral-500">{l}</div><div className="text-lg font-semibold">{v}</div></div>);
}
