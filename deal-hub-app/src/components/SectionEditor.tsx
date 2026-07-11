'use client';
import { useRef, useState } from 'react';

// Reusable autosaving editor for memo pages.
//  - "blocks": labelled textareas (Investment Thesis, Growth, Projections).
//  - "terms" : label -> single-line value (Governance, Transaction S&U, Exit range).
// Saves to MemoSection(page).data.{blocks|terms}. Body narrative is handled
// separately by MemoEditor on the same page key.
export default function SectionEditor({ dealId, page, mode, labels, initial, cols = 1, textarea = true }:
  { dealId: string; page: string; mode: 'blocks' | 'terms'; labels: string[]; initial: Record<string, string>; cols?: number; textarea?: boolean }) {
  const [state, setState] = useState<Record<string, string>>(initial || {});
  const [note, setNote] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(label: string, v: string) {
    const next = { ...state, [label]: v };
    setState(next); setNote('Saving…');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const res = await fetch(`/api/deals/${dealId}/memo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, data: { [mode]: next } }) });
      setNote(res.ok ? 'Saved ✓' : 'Error');
    }, 500);
  }

  if (mode === 'terms') {
    return (
      <div>
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {labels.map((l) => (
            <label key={l} className="text-sm">
              <span className="block text-[11px] text-neutral-500 mb-1">{l}</span>
              <input value={state[l] || ''} onChange={(e) => set(l, e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
            </label>
          ))}
        </div>
        <div className="text-xs text-neutral-400 mt-2">{note}</div>
      </div>
    );
  }
  return (
    <div>
      {labels.map((l) => (
        <div key={l} className="mb-4">
          <div className="text-sm font-semibold mb-1">{l}</div>
          {textarea
            ? <textarea value={state[l] || ''} onChange={(e) => set(l, e.target.value)} className="w-full border rounded-lg p-3 text-sm leading-relaxed min-h-[64px]" />
            : <input value={state[l] || ''} onChange={(e) => set(l, e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />}
        </div>
      ))}
      <div className="text-xs text-neutral-400">{note}</div>
    </div>
  );
}
