// B.23 Cross-Check Register — one row per material figure: value · where · method
// (Extracted/Calculated/Manual) · source · status. Discrepancies must be resolved
// or accepted before a deal moves to IC/Approved (soft gate).
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  Consistent: 'bg-green-50 text-green-700', Discrepancy: 'bg-red-50 text-red-700', Unverified: 'bg-neutral-100 text-neutral-600',
};
const METHOD_STYLE: Record<string, string> = {
  Extracted: 'bg-green-50 text-green-700', Calculated: 'bg-blue-50 text-accent', Manual: 'bg-neutral-100 text-neutral-600',
};

export default async function CrossCheck({ params }: { params: { id: string } }) {
  const rows = await prisma.crossCheckEntry.findMany({ where: { dealId: params.id }, orderBy: [{ status: 'asc' }, { figure: 'asc' }] });
  const discrepancies = rows.filter((r) => r.status === 'Discrepancy').length;

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Cross-Check Register</h2>
      <p className="text-sm text-neutral-500 mb-4">
        The audit backbone — every material figure with its method and source.
        {discrepancies > 0 && <span className="text-red-600 font-medium"> {discrepancies} discrepancy(ies) must be resolved before IC/Approved.</span>}
      </p>
      {rows.length === 0 ? (
        <div className="text-sm text-neutral-400">No entries yet. Accept an extraction on the Review screen (creates Extracted rows) or enter Financials (creates Calculated rows).</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase">
              <tr>{['Figure', 'Where', 'Method', 'Source', 'Status', 'Detail'].map((h) => <th key={h} className="text-left p-2 border-b">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top">
                  <td className="p-2 font-medium">{r.figure}</td>
                  <td className="p-2 text-neutral-500">{r.appearsAt || '—'}</td>
                  <td className="p-2"><span className={`text-[11px] rounded px-1.5 py-0.5 ${METHOD_STYLE[r.method] || ''}`}>{r.method}</span></td>
                  <td className="p-2 text-neutral-500 max-w-[220px] truncate">{r.source || '—'}</td>
                  <td className="p-2"><span className={`text-[11px] rounded px-1.5 py-0.5 ${STATUS_STYLE[r.status] || ''}`}>{r.status}</span></td>
                  <td className="p-2 text-neutral-500">{r.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
