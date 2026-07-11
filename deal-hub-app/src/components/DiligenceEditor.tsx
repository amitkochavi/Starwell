'use client';
import { useState } from 'react';

interface Q { q: string; status: string; answer: string }
const STATUS = ['Open', 'Sent', 'Answered'];

export default function DiligenceEditor({ dealId, initial }: { dealId: string; initial: Q[] }) {
  const [qs, setQs] = useState<Q[]>(initial || []);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  async function save(next: Q[]) {
    setQs(next); setNote('Saving…');
    const res = await fetch(`/api/deals/${dealId}/memo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: 'diligence', data: { questions: next } }) });
    setNote(res.ok ? 'Saved ✓' : 'Error');
  }
  const open = qs.filter((q) => q.status === 'Open');

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a diligence question" className="border rounded-md px-2 py-1.5 text-sm flex-1" />
        <button onClick={() => { if (text.trim()) { save([...qs, { q: text, status: 'Open', answer: '' }]); setText(''); } }} className="bg-ink text-white rounded-md px-4 py-1.5 text-sm">Add</button>
        <button onClick={() => navigator.clipboard?.writeText(open.map((q, i) => `${i + 1}. ${q.q}`).join('\n'))} className="border rounded-md px-3 py-1.5 text-sm">Copy {open.length} open</button>
      </div>
      {qs.length === 0 && <div className="text-sm text-neutral-400">No questions yet.</div>}
      {qs.map((q, i) => (
        <div key={i} className="border-b py-2 flex items-start gap-2">
          <div className="flex-1 text-sm">{q.q}{q.answer && <div className="text-green-700 text-xs mt-0.5">↳ {q.answer}</div>}</div>
          <select value={q.status} onChange={(e) => save(qs.map((x, j) => j === i ? { ...x, status: e.target.value } : x))} className="border rounded-md px-2 py-1 text-xs">{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
          <button onClick={() => { const a = prompt('Answer (cite call/doc)', q.answer); if (a != null) save(qs.map((x, j) => j === i ? { ...x, answer: a, status: 'Answered' } : x)); }} className="text-xs border rounded px-2 py-1">Answer</button>
          <button onClick={() => save(qs.filter((_, j) => j !== i))} className="text-red-500 text-xs px-1">✕</button>
        </div>
      ))}
      <div className="text-xs text-neutral-400 mt-2">{note}</div>
    </div>
  );
}
