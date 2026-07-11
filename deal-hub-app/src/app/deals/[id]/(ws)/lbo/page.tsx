// B.17 LBO Analysis — interactive returns model (deterministic engine,
// lib/finance.ts). Base/Bull/Bear, sensitivity grid, FCF/debt charts.
import { prisma } from '@/lib/prisma';
import { entryMultiple, type LboAssumptions } from '@/lib/finance';
import LboWorkbench from '@/components/LboWorkbench';

export const dynamic = 'force-dynamic';

export default async function Lbo({ params }: { params: { id: string } }) {
  const [deal, scenarios] = await Promise.all([
    prisma.deal.findUnique({ where: { id: params.id } }),
    prisma.lboScenario.findMany({ where: { dealId: params.id } }),
  ]);
  if (!deal) return <div>Deal not found.</div>;

  const em = entryMultiple(deal.evM, deal.ebitdaM).value;
  const ebitda = deal.ebitdaM ?? 2;
  const entryX = em ?? 5;
  const base: LboAssumptions = { ebitda, entryX, exitX: entryX, lev: 3, growth: 8, yrs: 5, rate: 10, tax: 25, capex: 5 };
  const defaults: Record<'Base' | 'Bull' | 'Bear', LboAssumptions> = {
    Base: base,
    Bull: { ...base, growth: 12, exitX: entryX + 1 },
    Bear: { ...base, growth: 4, exitX: Math.max(1, entryX - 1) },
  };
  for (const s of scenarios) {
    try { const a = JSON.parse(s.assumptions); if (s.name === 'Base' || s.name === 'Bull' || s.name === 'Bear') defaults[s.name] = { ...defaults[s.name], ...a }; } catch { /* ignore */ }
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">LBO Analysis</h2>
      <p className="text-sm text-neutral-500 mb-4">Deterministic cash-sweep model — no AI in the loop. FCF sweeps to debt each year. Defaults seed from the deal&rsquo;s EBITDA and entry multiple.</p>
      <LboWorkbench dealId={params.id} initial={defaults} />
    </div>
  );
}
