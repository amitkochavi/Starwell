'use client';
// HC.4 Stress leverage bars — leverage under each scenario vs the covenant ceiling.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';

export default function StressChart({ data, cov }: { data: { name: string; leverage: number | null }[]; cov: number | null }) {
  const rows = data.filter((d) => d.leverage != null).map((d) => ({ name: d.name, leverage: Math.round((d.leverage as number) * 100) / 100 }));
  if (!rows.length) return <div className="text-sm text-neutral-500">Needs aggregate EBITDA &gt; 0 to stress leverage.</div>;
  const color = (lev: number) => (cov != null && lev >= cov ? '#b5342a' : cov != null && lev >= 0.85 * cov ? '#d08700' : '#1a7a5a');
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v + '×'} />
        <Tooltip formatter={(v: number) => v + '×'} />
        {cov != null && <ReferenceLine y={cov} stroke="#b5342a" strokeDasharray="4 3" label={{ value: `Cov ${cov.toFixed(2)}×`, fontSize: 10, fill: '#b5342a', position: 'right' }} />}
        <Bar dataKey="leverage" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={color(r.leverage)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
