'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export interface Step { label: string; value: number; cumulative: number; kind: 'total' | 'up' | 'down' }

// Net-income bridge waterfall (B.15). Transparent base bar + colored delta.
export default function BridgeChart({ steps }: { steps: Step[] }) {
  const data = steps.map((s, i) => {
    if (s.kind === 'total') return { label: s.label, base: Math.min(0, s.cumulative), delta: Math.abs(s.cumulative), kind: s.kind, raw: s.value };
    const prev = steps[i - 1].cumulative;
    const lo = Math.min(prev, s.cumulative), hi = Math.max(prev, s.cumulative);
    return { label: s.label, base: lo, delta: hi - lo, kind: s.kind, raw: s.value };
  });
  const color = (k: string) => (k === 'total' ? '#6a7a99' : k === 'up' ? '#1a7a5a' : '#b5342a');
  const k = (v: number) => '$' + (v / 1000).toFixed(0) + 'k';
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, bottom: 40, left: 10 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={k} />
        <Tooltip formatter={(_v, _n, p) => '$' + Math.round((p.payload as { raw: number }).raw).toLocaleString()} />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="delta" stackId="a" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={color(d.kind)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
