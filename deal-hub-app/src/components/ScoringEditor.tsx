'use client';
import { useRef, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function ScoringEditor({ dealId, kind, axes, weightLabel, initial }:
  { dealId: string; kind: 'quant' | 'qual'; axes: string[]; weightLabel: string; initial: Record<string, { value: number | null; rationale: string }> }) {
  const [state, setState] = useState(() => Object.fromEntries(axes.map((a) => [a, initial[a] || { value: 3, rationale: '' }])) as Record<string, { value: number | null; rationale: string }>);
  const [note, setNote] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(next: typeof state) {
    setState(next); setNote('Saving…');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const entries = axes.map((a) => ({ axis: a, value: next[a].value, rationale: next[a].rationale }));
      const res = await fetch(`/api/deals/${dealId}/scores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, entries }) });
      setNote(res.ok ? 'Saved ✓' : 'Error');
    }, 500);
  }
  const vals = axes.map((a) => state[a].value).filter((v): v is number => v != null);
  const integral = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
  const radar = axes.map((a) => ({ axis: a.length > 16 ? a.slice(0, 15) + '…' : a, value: state[a].value ?? 0 }));

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6 items-start">
      <div>
        {axes.map((a) => (
          <div key={a} className="py-2 border-b">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm">{a}</span>
              <input type="range" min={1} max={5} step={0.5} value={state[a].value ?? 3} onChange={(e) => save({ ...state, [a]: { ...state[a], value: Number(e.target.value) } })} className="w-40" />
              <span className="w-8 text-right font-semibold text-sm">{state[a].value ?? '—'}</span>
            </div>
            <input value={state[a].rationale} onChange={(e) => save({ ...state, [a]: { ...state[a], rationale: e.target.value } })} placeholder="Rationale" className="mt-1 w-full border rounded-md px-2 py-1 text-xs" />
          </div>
        ))}
        <div className="mt-3">
          <div className="text-[11px] text-neutral-500">{weightLabel}</div>
          <div className="text-2xl font-semibold">{integral != null ? integral.toFixed(2) + ' / 5' : '—'}</div>
          <div className="text-xs text-neutral-400">{note}</div>
        </div>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radar} outerRadius={100}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9 }} />
            <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
            <Radar dataKey="value" stroke={kind === 'quant' ? '#2b5ea7' : '#1a7a5a'} fill={kind === 'quant' ? '#2b5ea7' : '#1a7a5a'} fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
