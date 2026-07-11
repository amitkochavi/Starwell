'use client';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Annual revenue (bars) vs active customers (line) — the B.19 hero combo chart.
export default function CohortChart({ data }: { data: { year: number; revenue: number; active: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number, n: string) => n === 'revenue' ? '$' + v.toLocaleString() : v} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill="#132033" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" dataKey="active" name="Active customers" stroke="#b5342a" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
