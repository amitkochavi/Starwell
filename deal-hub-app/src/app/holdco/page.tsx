// Module HC — HoldCo consolidated model. Debt raised at the HoldCo, serviced by
// aggregate OpCo (Closed deals) cash flow. Deterministic (lib/holdco.ts): a missing
// input renders "—" and disables the affected output.
import { prisma } from '@/lib/prisma';
import { consolidate, levStatus, dscrStatus, type FacilityLite, type OpCoLite } from '@/lib/holdco';
import { dash, money, mult } from '@/lib/finance';
import FacilityManager, { type FacRow } from '@/components/FacilityManager';
import StressChart from '@/components/StressChart';

export const dynamic = 'force-dynamic';

const CAPEX_PCT = 5; // aggregate maintenance capex as % of consolidated EBITDA

function parseFac(f: { id: string; lender: string; commitment: number; drawn: number; spreadBps: number | null; amortization: string | null; covenants: string | null }): FacRow {
  let amortAnnual = 0, cov: { maxLeverage: number | null; minDSCR: number | null } = { maxLeverage: null, minDSCR: null };
  try { amortAnnual = JSON.parse(f.amortization || '{}').annual || 0; } catch { /* ignore */ }
  try { cov = { maxLeverage: null, minDSCR: null, ...JSON.parse(f.covenants || '{}') }; } catch { /* ignore */ }
  return { id: f.id, lender: f.lender, commitment: f.commitment, drawn: f.drawn, rateBps: f.spreadBps || 0, amortAnnual, maxLeverage: cov.maxLeverage, minDSCR: cov.minDSCR };
}

export default async function HoldCoPage() {
  let facRows: FacRow[] = [], opcos: OpCoLite[] = [], dbError: string | null = null;
  try {
    const [facs, closed] = await Promise.all([
      prisma.holdCoFacility.findMany({ orderBy: { lender: 'asc' } }),
      prisma.deal.findMany({ where: { status: 'Closed' } }),
    ]);
    facRows = facs.map(parseFac);
    opcos = closed.filter((d) => d.ebitdaM != null).map((d) => ({ name: d.projectName, ebitda: d.ebitdaM as number, ownership: 1 }));
  } catch (e: any) { dbError = e.message; }

  if (dbError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">HoldCo</h1>
        <div className="rounded-lg border border-dashed bg-white p-8 text-center text-neutral-500">
          Database not initialized. Run <code>npm run db:push &amp;&amp; npm run db:seed</code>.
          <div className="text-xs mt-2 opacity-60">{dbError}</div>
        </div>
      </div>
    );
  }

  const facsLite: FacilityLite[] = facRows.map((f) => ({ drawn: f.drawn, rateBps: f.rateBps, amortAnnual: f.amortAnnual, maxLeverage: f.maxLeverage, minDSCR: f.minDSCR }));
  const c = consolidate(facsLite, opcos, CAPEX_PCT);
  const levS = levStatus(c.leverage, c.covMaxLev);
  const dscrS = dscrStatus(c.dscr, c.covMinDSCR);

  // HC.4 stress grid: EBITDA down 10/20/30%, rate up 100/200 bps.
  const stress = [
    { name: 'Base', scale: 1, bump: 0 },
    { name: 'EBITDA −10%', scale: 0.9, bump: 0 },
    { name: 'EBITDA −20%', scale: 0.8, bump: 0 },
    { name: 'EBITDA −30%', scale: 0.7, bump: 0 },
    { name: 'Rate +100bps', scale: 1, bump: 100 },
    { name: 'Rate +200bps', scale: 1, bump: 200 },
    { name: 'EBITDA −20% & Rate +200bps', scale: 0.8, bump: 200 },
  ].map((s) => ({ ...s, r: consolidate(facsLite, opcos, CAPEX_PCT, s.bump, s.scale) }));

  const STAT = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', na: 'bg-neutral-100 text-neutral-400' };
  const LBL = { green: 'Compliant', amber: 'Tight', red: 'Breach', na: 'No covenant' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">HoldCo Consolidated Model</h1>
        <span className="text-xs text-neutral-500">{opcos.length} OpCo{opcos.length === 1 ? '' : 's'} (Closed) · {facRows.length} facilit{facRows.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {/* Consolidation summary */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold border-b pb-1.5 mb-4">Consolidated position <span className="text-[9px] bg-blue-50 text-accent rounded px-1">CALC</span></h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi l="Aggregate EBITDA" v={dash(c.ebitda || null, money)} big />
          <Kpi l="Net debt (drawn)" v={dash(c.netDebt || null, money)} big />
          <Kpi l="Leverage" v={dash(c.leverage, mult)} big />
          <Kpi l="Annual interest" v={dash(c.interest || null, money)} />
          <Kpi l="Amortization" v={dash(c.amort || null, money)} />
          <Kpi l="Debt service" v={dash(c.debtService || null, money)} />
          <Kpi l="Maint. capex" v={dash(c.capex || null, money)} />
          <Kpi l="DSCR" v={dash(c.dscr, mult)} />
          <Kpi l="Max-lev covenant" v={dash(c.covMaxLev, mult)} />
          <Kpi l="Min-DSCR covenant" v={dash(c.covMinDSCR, mult)} />
          <Kpi l="Debt capacity" v={dash(c.capacity, money)} />
        </div>
        {opcos.length === 0 && <p className="text-xs text-amber-600 mt-3">No OpCos: close deals (status → Closed) with an approved EBITDA to populate the consolidated model.</p>}
      </section>

      {/* Covenant headroom */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold border-b pb-1.5 mb-4">Covenant headroom</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Cov label="Leverage (Net debt / EBITDA)" cur={c.leverage} cov={c.covMaxLev} unit="×"
            headroom={c.covMaxLev != null && c.leverage != null ? c.covMaxLev - c.leverage : null} dir="below"
            status={levS} statText={LBL[levS]} statCls={STAT[levS]} />
          <Cov label="DSCR ((EBITDA − capex) / debt service)" cur={c.dscr} cov={c.covMinDSCR} unit="×"
            headroom={c.covMinDSCR != null && c.dscr != null ? c.dscr - c.covMinDSCR : null} dir="above"
            status={dscrS} statText={LBL[dscrS]} statCls={STAT[dscrS]} />
        </div>
      </section>

      {/* OpCo contribution */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold border-b pb-1.5 mb-4">OpCo contribution</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-2.5">OpCo</th><th className="text-right p-2.5">EBITDA</th><th className="text-right p-2.5">Ownership</th><th className="text-right p-2.5">Attributable</th></tr>
            </thead>
            <tbody>
              {opcos.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-neutral-400">No Closed OpCos.</td></tr>}
              {opcos.map((o) => (
                <tr key={o.name} className="border-t">
                  <td className="p-2.5 font-medium">{o.name}</td>
                  <td className="p-2.5 num">{money(o.ebitda)}</td>
                  <td className="p-2.5 num">{(o.ownership * 100).toFixed(0)}%</td>
                  <td className="p-2.5 num">{money(o.ebitda * o.ownership)}</td>
                </tr>
              ))}
            </tbody>
            {opcos.length > 0 && <tfoot><tr className="border-t font-semibold bg-neutral-50/50"><td className="p-2.5">Total</td><td className="p-2.5 num">{money(opcos.reduce((s, o) => s + o.ebitda, 0))}</td><td /><td className="p-2.5 num">{money(c.ebitda)}</td></tr></tfoot>}
          </table>
        </div>
      </section>

      {/* Facility register */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold border-b pb-1.5 mb-4">Facility register</h2>
        <FacilityManager facilities={facRows} />
      </section>

      {/* Stress tests */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold border-b pb-1.5 mb-4">Stress tests</h2>
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wide">
                <tr><th className="text-left p-2.5">Scenario</th><th className="text-right p-2.5">Leverage</th><th className="text-right p-2.5">DSCR</th><th className="text-right p-2.5">Capacity</th><th className="text-center p-2.5">Status</th></tr>
              </thead>
              <tbody>
                {stress.map((s) => {
                  const st = levStatus(s.r.leverage, s.r.covMaxLev);
                  return (
                    <tr key={s.name} className="border-t">
                      <td className="p-2.5">{s.name}</td>
                      <td className="p-2.5 num">{dash(s.r.leverage, mult)}</td>
                      <td className="p-2.5 num">{dash(s.r.dscr, mult)}</td>
                      <td className="p-2.5 num">{dash(s.r.capacity, money)}</td>
                      <td className="p-2.5 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAT[st]}`}>{LBL[st]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <StressChart data={stress.map((s) => ({ name: s.name, leverage: s.r.leverage }))} cov={c.covMaxLev} />
        </div>
        <p className="text-[11px] text-neutral-400 mt-3">Leverage colored against the tightest max-leverage covenant ({dash(c.covMaxLev, mult)}). Rate stresses re-price the full drawn balance (floating).</p>
      </section>
    </div>
  );
}

function Kpi({ l, v, big }: { l: string; v: string; big?: boolean }) {
  return (<div className="border rounded-lg p-3"><div className="text-[10px] uppercase text-neutral-500">{l}</div><div className={`${big ? 'text-2xl' : 'text-lg'} font-semibold`}>{v}</div></div>);
}
function Cov({ label, cur, cov, unit, headroom, dir, statText, statCls }: {
  label: string; cur: number | null; cov: number | null; unit: string; headroom: number | null; dir: 'above' | 'below'; status: string; statText: string; statCls: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statCls}`}>{statText}</span>
      </div>
      <div className="flex gap-6 text-sm">
        <div><div className="text-[10px] uppercase text-neutral-500">Current</div><div className="text-xl font-semibold">{cur != null ? cur.toFixed(2) + unit : '—'}</div></div>
        <div><div className="text-[10px] uppercase text-neutral-500">Covenant</div><div className="text-xl font-semibold">{cov != null ? cov.toFixed(2) + unit : '—'}</div></div>
        <div><div className="text-[10px] uppercase text-neutral-500">Headroom</div><div className="text-xl font-semibold">{headroom != null ? (headroom >= 0 ? '' : '') + headroom.toFixed(2) + unit : '—'}</div></div>
      </div>
      <div className="text-[11px] text-neutral-400 mt-2">Must stay {dir === 'below' ? 'at or below' : 'at or above'} the covenant.</div>
    </div>
  );
}
