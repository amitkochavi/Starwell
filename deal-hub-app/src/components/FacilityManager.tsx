'use client';
// HC.1 Facility register — add / list / delete HoldCo debt facilities.
// Floating-rate only for now; covenants stored as {maxLeverage, minDSCR}.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface FacRow {
  id: string; lender: string; commitment: number; drawn: number;
  rateBps: number; amortAnnual: number; maxLeverage: number | null; minDSCR: number | null;
}
const money = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';

export default function FacilityManager({ facilities }: { facilities: FacRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ lender: '', commitment: '', drawn: '', rateBps: '700', amortAnnual: '', maxLeverage: '', minDSCR: '' });
  const num = (s: string) => (s === '' ? undefined : Number(s));

  async function add() {
    if (!f.lender) return;
    setBusy(true);
    await fetch('/api/holdco/facilities', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lender: f.lender, commitment: num(f.commitment) ?? 0, drawn: num(f.drawn) ?? 0,
        rateBps: num(f.rateBps) ?? 0, amortAnnual: num(f.amortAnnual) ?? 0, maxLeverage: num(f.maxLeverage), minDSCR: num(f.minDSCR) }) });
    setF({ lender: '', commitment: '', drawn: '', rateBps: '700', amortAnnual: '', maxLeverage: '', minDSCR: '' });
    setBusy(false); router.refresh();
  }
  async function del(id: string) {
    setBusy(true);
    await fetch(`/api/holdco/facilities/${id}`, { method: 'DELETE' });
    setBusy(false); router.refresh();
  }

  const I = (k: keyof typeof f, ph: string, w = 'w-full') => (
    <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph}
      className={`${w} border rounded-md px-2 py-1 text-sm`} />
  );

  return (
    <div>
      <div className="overflow-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wide">
            <tr>
              {['Lender', 'Commitment', 'Drawn', 'Rate', 'Amort/yr', 'Max lev', 'Min DSCR', ''].map((h, i) => (
                <th key={h + i} className={`text-left p-2.5 whitespace-nowrap ${i >= 1 && i <= 6 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-neutral-400">No facilities yet — add one below.</td></tr>}
            {facilities.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-2.5 font-medium">{x.lender}</td>
                <td className="p-2.5 num">{money(x.commitment)}</td>
                <td className="p-2.5 num">{money(x.drawn)}</td>
                <td className="p-2.5 num">{(x.rateBps / 100).toFixed(2)}%</td>
                <td className="p-2.5 num">{x.amortAnnual ? money(x.amortAnnual) : '—'}</td>
                <td className="p-2.5 num">{x.maxLeverage != null ? x.maxLeverage.toFixed(2) + '×' : '—'}</td>
                <td className="p-2.5 num">{x.minDSCR != null ? x.minDSCR.toFixed(2) + '×' : '—'}</td>
                <td className="p-2.5 text-right"><button onClick={() => del(x.id)} disabled={busy} className="text-xs text-red-600 hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-neutral-50/50">
              <td className="p-2">{I('lender', 'Lender')}</td>
              <td className="p-2">{I('commitment', '$M', 'w-20')}</td>
              <td className="p-2">{I('drawn', '$M', 'w-20')}</td>
              <td className="p-2">{I('rateBps', 'bps', 'w-20')}</td>
              <td className="p-2">{I('amortAnnual', '$M', 'w-20')}</td>
              <td className="p-2">{I('maxLeverage', '×', 'w-16')}</td>
              <td className="p-2">{I('minDSCR', '×', 'w-16')}</td>
              <td className="p-2 text-right"><button onClick={add} disabled={busy || !f.lender} className="bg-ink text-white rounded-md px-3 py-1 text-xs disabled:opacity-40">Add</button></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-neutral-400 mt-2">Rate in basis points (700 = 7.00%). Covenants optional; the tightest across facilities governs.</p>
    </div>
  );
}
