'use client';
import { useMemo, useRef, useState } from 'react';
import { lbo, type LboAssumptions } from '@/lib/finance';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Scenario = 'Base' | 'Bull' | 'Bear';
const SCENARIOS: Scenario[] = ['Base', 'Bull', 'Bear'];
const FIELDS: [keyof LboAssumptions, string, number][] = [
  ['ebitda', 'Entry EBITDA ($M)', 0.1], ['entryX', 'Entry multiple (×)', 0.25], ['exitX', 'Exit multiple (×)', 0.25],
  ['lev', 'Leverage (Debt/EBITDA)', 0.25], ['growth', 'EBITDA growth (%/yr)', 0.5], ['yrs', 'Hold (years)', 1],
  ['rate', 'Interest rate (%)', 0.25], ['tax', 'Tax rate (%)', 1], ['capex', 'Capex (% EBITDA)', 0.5],
];
const money = (n: number) => '$' + n.toFixed(1) + 'M';
const stepsArr = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

export default function LboWorkbench({ dealId, initial }: { dealId: string; initial: Record<Scenario, LboAssumptions> }) {
  const [scn, setScn] = useState<Scenario>('Base');
  const [all, setAll] = useState<Record<Scenario, LboAssumptions>>(initial);
  const [note, setNote] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const A = all[scn];
  const out = useMemo(() => lbo(A), [A]);

  function set(k: keyof LboAssumptions, v: number) {
    const next = { ...all, [scn]: { ...A, [k]: v } };
    setAll(next); setNote('Saving…');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const o = lbo(next[scn]);
      const res = await fetch(`/api/deals/${dealId}/lbo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: scn, assumptions: next[scn], outputs: o }) });
      setNote(res.ok ? 'Saved ✓' : 'Error');
    }, 500);
  }

  // Sensitivity grid: IRR by Entry × Exit
  const grid = useMemo(() => {
    if (!out) return null;
    const cols = stepsArr.map((s) => +(A.entryX + s).toFixed(2)).filter((v) => v > 0);
    const rows = stepsArr.map((s) => +(A.exitX + s).toFixed(2)).filter((v) => v > 0);
    const cells = rows.map((rx) => cols.map((cx) => lbo({ ...A, entryX: cx, exitX: rx })?.irr ?? null));
    const flat = cells.flat().filter((v): v is number => v != null);
    const mn = Math.min(...flat), mx = Math.max(...flat);
    return { cols, rows, cells, mn, mx };
  }, [A, out]);
  const heat = (v: number) => { const t2 = grid && grid.mx > grid.mn ? (v - grid.mn) / (grid.mx - grid.mn) : 0.5; return `hsl(${Math.round(t2 * 120)},62%,${91 - t2 * 20}%)`; };

  const chartData = out ? out.series.map((s) => ({ year: 'Y' + s.y, fcf: Math.round(s.fcf * 10) / 10, debt: Math.round(s.debt * 10) / 10, cash: Math.round(s.cash * 10) / 10 })) : [];

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {SCENARIOS.map((s) => <button key={s} onClick={() => setScn(s)} className={`px-3 py-1.5 rounded-md text-sm ${scn === s ? 'bg-ink text-white' : 'border'}`}>{s}</button>)}
        <span className="ml-3 self-center text-xs text-neutral-400">{note}</span>
      </div>
      <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
        <div>
          <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Assumptions · {scn}</h3>
          {FIELDS.map(([k, label, step]) => (
            <label key={k} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="text-neutral-600">{label}</span>
              <input type="number" step={step} value={A[k]} onChange={(e) => set(k, e.target.value === '' ? 0 : Number(e.target.value))} className="w-24 border rounded-md px-2 py-1 text-right text-sm" />
            </label>
          ))}
        </div>
        <div>
          <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Outputs <span className="text-[9px] bg-blue-50 text-accent rounded px-1">CALC</span></h3>
          {out ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Kpi l={`Year-${A.yrs} IRR`} v={out.irr != null ? (out.irr * 100).toFixed(1) + '%' : '—'} big />
              <Kpi l={`Year-${A.yrs} MOIC`} v={out.moic.toFixed(2) + '×'} big />
              <Kpi l="Exit EV" v={money(out.exitEv)} />
              <Kpi l="Equity to Common" v={money(out.exitEquity)} />
              <Kpi l="Entry Equity" v={money(out.equity)} />
              <Kpi l="Entry Debt" v={money(out.debt)} />
            </div>
          ) : <div className="border rounded-lg p-4 text-sm text-neutral-500">Refuses to render — needs entry EBITDA &gt; 0, entry multiple &gt; 0, and positive equity (leverage below entry multiple).</div>}
        </div>
      </div>

      {out && grid && (
        <>
          <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Sensitivity — IRR by Entry × Exit multiple</h3>
          <div className="overflow-auto">
            <table className="text-xs border-collapse">
              <thead><tr><th className="border p-1.5 bg-neutral-50">Exit ↓ / Entry →</th>{grid.cols.map((c) => <th key={c} className="border p-1.5 bg-neutral-50">{c.toFixed(2)}×</th>)}</tr></thead>
              <tbody>
                {grid.rows.map((rx, ri) => (
                  <tr key={rx}><th className="border p-1.5 bg-neutral-50">{rx.toFixed(2)}×</th>
                    {grid.cols.map((cx, ci) => { const v = grid.cells[ri][ci]; const base = cx === A.entryX && rx === A.exitX;
                      return <td key={cx} className="border p-1.5 text-right" style={{ background: v != null ? heat(v) : undefined, outline: base ? '2px solid #0f0f14' : undefined, fontWeight: base ? 700 : 400 }}>{v != null ? (v * 100).toFixed(0) + '%' : '—'}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold border-b pb-1.5 mt-6 mb-3">Free cash flow &amp; debt paydown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + v + 'M'} />
              <Tooltip formatter={(v: number) => '$' + v + 'M'} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="fcf" name="Free cash flow" fill="#1a7a5a" radius={[3, 3, 0, 0]} />
              <Line dataKey="debt" name="Debt" stroke="#b5342a" strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="cash" name="Cash" stroke="#2b5ea7" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
function Kpi({ l, v, big }: { l: string; v: string; big?: boolean }) {
  return (<div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">{l}</div><div className={`${big ? 'text-2xl' : 'text-lg'} font-semibold`}>{v}</div></div>);
}
