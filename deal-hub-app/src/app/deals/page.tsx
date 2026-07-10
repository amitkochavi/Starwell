// Module A — Deal Database (server component; queries Prisma at request time).
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { entryMultiple, dash, money, mult } from '@/lib/finance';
import NewDealButton from '@/components/NewDealButton';

export const dynamic = 'force-dynamic';

const STATUSES = ['Underwriting', 'Call scheduled', 'IC', 'Approved', 'Pass', 'Hold', 'Lost', 'Closed'];

export default async function DealsPage({ searchParams }: { searchParams: { status?: string } }) {
  let deals: any[] = [];
  let dbError: string | null = null;
  try {
    deals = await prisma.deal.findMany({ orderBy: { dateOfEntry: 'desc' } });
  } catch (e: any) {
    dbError = e.message;
  }
  const active = searchParams.status || 'All';
  const counts: Record<string, number> = { All: deals.length };
  STATUSES.forEach((s) => (counts[s] = deals.filter((d) => d.status === s).length));
  const rows = active === 'All' ? deals : deals.filter((d) => d.status === active);

  if (dbError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Deal Database</h1>
        <div className="rounded-lg border border-dashed bg-white p-8 text-center text-neutral-500">
          Database not initialized. Run <code>npm run db:push &amp;&amp; npm run db:seed</code>.
          <div className="text-xs mt-2 opacity-60">{dbError}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Deal Database</h1>
        <NewDealButton />
      </div>
      <div className="flex gap-1 border-b mb-4 text-sm flex-wrap">
        {['All', ...STATUSES].map((s) => (
          <Link key={s} href={s === 'All' ? '/deals' : `/deals?status=${encodeURIComponent(s)}`}
            className={`px-3 py-2 -mb-px border-b-2 ${active === s ? 'border-accent text-ink font-semibold' : 'border-transparent text-neutral-500'}`}>
            {s} <span className="ml-1 text-xs bg-neutral-100 rounded-full px-2">{counts[s]}</span>
          </Link>
        ))}
      </div>
      <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wide">
            <tr>
              {['Status', 'Project', 'Lead', 'Priority', 'Revenue', 'EBITDA', 'Entry ×', 'Type', 'Industry'].map((h) => (
                <th key={h} className={`text-left p-3 whitespace-nowrap ${['Revenue', 'EBITDA', 'Entry ×'].includes(h) ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-neutral-400">No deals{active === 'All' ? '' : ` in “${active}”`}.</td></tr>
            )}
            {rows.map((d) => {
              const em = entryMultiple(d.evM, d.ebitdaM).value;
              return (
                <tr key={d.id} className="border-t hover:bg-neutral-50">
                  <td className="p-3"><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-accent">{d.status}</span></td>
                  <td className="p-3"><Link href={`/deals/${d.id}`} className="font-semibold hover:text-accent">{d.projectName}</Link></td>
                  <td className="p-3">{d.dealLead || '—'}</td>
                  <td className="p-3">{d.priority || '—'}</td>
                  <td className="p-3 num">{dash(d.revenueM, money)}</td>
                  <td className="p-3 num">{dash(d.ebitdaM, money)}</td>
                  <td className="p-3 num">{dash(em, mult)}</td>
                  <td className="p-3">{d.dealType || '—'}</td>
                  <td className="p-3">{d.subIndustry || d.industry || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
