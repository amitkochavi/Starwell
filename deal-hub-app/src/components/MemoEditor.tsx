'use client';
import { useRef, useState } from 'react';

// Autosaving analyst textarea for a memo section (B.1/B.2). Marked "Analyst view"
// because it is human-written (criterion 24: LLM text is cited or marked Analyst view).
export default function MemoEditor({ dealId, page, initial, placeholder }: { dealId: string; page: string; initial: string; placeholder?: string }) {
  const [val, setVal] = useState(initial);
  const [note, setNote] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onChange(v: string) {
    setVal(v); setNote('Saving…');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const res = await fetch(`/api/deals/${dealId}/memo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, body: v }) });
      setNote(res.ok ? 'Saved ✓' : 'Error saving');
    }, 500);
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5">Analyst view</span>
        <span className="text-xs text-neutral-400">{note}</span>
      </div>
      <textarea value={val} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg p-3 text-sm leading-relaxed min-h-[120px]" />
    </div>
  );
}
