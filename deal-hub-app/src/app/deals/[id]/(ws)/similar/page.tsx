// B.18 Similar Deals & Patterns — Incoming Deal Decision Gate (computed from the
// deal's metrics against gate rules) + pattern match against the deal book.
import { prisma } from '@/lib/prisma';
import { entryMultiple, marginPct, mult, pct } from '@/lib/finance';

export const dynamic = 'force-dynamic';

interface Rule { name: string; clears: string; fails: string; test: (em: number | null, margin: number | null) => 'clear' | 'fail' | 'review' }
const RULES: Rule[] = [
  { name: 'Cheap entry is supportive, not sufficient', clears: 'Entry ≤ 6× and other gates pass', fails: 'Reliance on cheapness alone', test: (em) => em == null ? 'review' : em <= 6 ? 'clear' : 'review' },
  { name: 'Margins are positive only if earnings quality is credible', clears: 'EBITDA margin ≥ 15% with clean quality', fails: 'Margin without evidenced quality', test: (_e, m) => m == null ? 'review' : m >= 15 ? 'clear' : 'fail' },
  { name: 'Concentration tolerable only if bounded by evidence', clears: 'Top-1 bounded + contracted', fails: 'Unbounded concentration', test: () => 'review' },
  { name: 'Cash conversion must be real after capex and working capital', clears: 'FCF conversion evidenced', fails: 'Accrual-only profits', test: () => 'review' },
];

export default async function Similar({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!deal) return <div>Deal not found.</div>;
  const others = await prisma.deal.findMany({ where: { id: { not: params.id } }, take: 12 });

  const em = entryMultiple(deal.evM, deal.ebitdaM).value;
  const margin = marginPct(deal.ebitdaM, deal.revenueM);
  const verdicts = RULES.map((r) => r.test(em, margin));
  const gate = verdicts.includes('fail') ? 'FAIL' : verdicts.includes('review') ? 'REVIEW · INFORMATION GATE' : 'CLEAR';
  const gateColor = gate === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' : gate.startsWith('REVIEW') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-700 border-green-200';

  const good = others.filter((d) => ['Closed', 'Approved'].includes(d.status));
  const bad = others.filter((d) => ['Pass', 'Lost'].includes(d.status));
  const sameIndustry = (d: typeof others[0]) => d.subIndustry && d.subIndustry === deal.subIndustry;

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Similar Deals &amp; Patterns</h2>
      <p className="text-sm text-neutral-500 mb-4">The gate reads this deal&rsquo;s approved metrics against the historical rules; the memory is your deal book.</p>

      <div className={`rounded-lg border p-4 mb-5 ${gateColor}`}>
        <div className="text-[11px] uppercase tracking-wide">Incoming Deal Decision Gate</div>
        <div className="text-2xl font-semibold">{gate}</div>
        <div className="text-sm mt-1">Entry multiple {em == null ? '—' : mult(em)} · EBITDA margin {margin == null ? '—' : pct(margin)}
          {' · '}Decisive factor: {verdicts.includes('fail') ? 'margin / earnings quality' : em != null && em <= 6 ? 'valuation supportive' : 'incomplete evidence'}</div>
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Historical Gate Rules</h3>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {RULES.map((r, i) => (
          <div key={r.name} className="border rounded-lg p-3">
            <div className="flex items-center justify-between"><div className="text-sm font-medium">{r.name}</div>
              <span className={`text-[10px] rounded px-1.5 py-0.5 ${verdicts[i] === 'clear' ? 'bg-green-50 text-green-700' : verdicts[i] === 'fail' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{verdicts[i]}</span></div>
            <div className="text-[11px] text-neutral-500 mt-1"><b>Clears if</b> {r.clears}</div>
            <div className="text-[11px] text-neutral-500"><b>Fails if</b> {r.fails}</div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold border-b pb-1.5 mb-3">Historical Pattern Match</h3>
      {others.length === 0 ? <div className="text-sm text-neutral-400">No other deals in the book yet.</div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {[...good.map((d) => ({ d, tag: 'GOOD DEAL' as const })), ...bad.map((d) => ({ d, tag: 'BAD DEAL PATTERN' as const }))].slice(0, 8).map(({ d, tag }) => (
            <div key={d.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between"><div className="text-sm font-medium">{d.projectName}</div>
                <span className={`text-[10px] rounded px-1.5 py-0.5 ${tag === 'GOOD DEAL' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{tag}</span></div>
              <div className="text-[11px] text-neutral-500 mt-1">{d.status} · {d.subIndustry || d.industry || '—'} {sameIndustry(d) ? '· same sub-industry (match)' : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
