'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row { y: string; rev: string; ebitda: string; margin: string; capex: string }
const BLANK: Row[] = [
  { y: 'FY-2', rev: '', ebitda: '', margin: '', capex: '' },
  { y: 'FY-1', rev: '', ebitda: '', margin: '', capex: '' },
  { y: 'LTM', rev: '', ebitda: '', margin: '', capex: '' },
  { y: 'FY+1 (F)', rev: '', ebitda: '', margin: '', capex: '' },
];
const LINES: [keyof Row, string][] = [['rev', 'Revenue'], ['ebitda', 'EBITDA / SDE'], ['margin', 'Margin %'], ['capex', 'CapEx']];

export default function FinancialsTable({ dealId, initial }: { dealId: string; initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : BLANK);
  const [note, setNote] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(next: Row[]) {
    setRows(next); setNote('Saving…');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const res = await fetch(`/api/deals/${dealId}/memo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: 'financials', data: { years: next } }) });
      setNote(res.ok ? 'Saved ✓ (recomputed CAGRs)' : 'Error');
      router.refresh(); // pull recomputed cross-check / exec cards
    }, 600);
  }
  const setCell = (ci: number, k: keyof Row, v: string) => { const n = rows.map((r, i) => i === ci ? { ...r, [k]: v } : r); save(n); };
  const addYear = () => save([...rows, { y: 'FY', rev: '', ebitda: '', margin: '', capex: '' }]);

  return (
    <div>
      <div className="overflow-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="border p-1.5 text-left">Line ($M)</th>
              {rows.map((r, ci) => <th key={ci} className="border p-1.5"><input value={r.y} onChange={(e) => setCell(ci, 'y', e.target.value)} className="w-20 text-right bg-transparent outline-none" /></th>)}
            </tr>
          </thead>
          <tbody>
            {LINES.map(([k, label]) => (
              <tr key={k}>
                <td className="border p-1.5">{label}</td>
                {rows.map((r, ci) => <td key={ci} className="border p-1.5"><input value={r[k]} onChange={(e) => setCell(ci, k, e.target.value)} className="w-20 text-right bg-transparent outline-none focus:bg-blue-50" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button onClick={addYear} className="text-xs text-accent">+ Add year</button>
        <span className="text-xs text-neutral-400">{note}</span>
      </div>
    </div>
  );
}
