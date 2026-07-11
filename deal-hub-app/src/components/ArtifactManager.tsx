'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Artifact { id: string; title: string; category: string; status: string; externalUrl: string | null; notes: string | null }
const CATEGORIES = ['HoldCo deck', 'Strategy', 'Investment Thesis', 'OpCo materials', 'LP / investor materials', 'Templates', 'Deal memos', 'Other'];
const STATUS = ['Draft', 'In review', 'Final'];

export default function ArtifactManager({ items }: { items: Artifact[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(''); const [cat, setCat] = useState(CATEGORIES[0]); const [url, setUrl] = useState(''); const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return; setBusy(true);
    await fetch('/api/artifacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, category: cat, externalUrl: url || undefined }) });
    setBusy(false); setTitle(''); setUrl(''); router.refresh();
  }
  async function setStatus(id: string, status: string) { await fetch(`/api/artifacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); router.refresh(); }
  async function del(id: string) { await fetch(`/api/artifacts/${id}`, { method: 'DELETE' }); router.refresh(); }

  const shown = items.filter((i) => !q || i.title.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase()));
  const byCat = CATEGORIES.map((c) => ({ c, items: shown.filter((i) => i.category === c) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="flex gap-2 flex-wrap items-end mb-5 border-b pb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="border rounded-md px-2 py-1.5 text-sm flex-1 min-w-[180px]" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (Drive / artifact URL)" className="border rounded-md px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
        <button onClick={add} disabled={busy} className="bg-ink text-white rounded-md px-4 py-1.5 text-sm disabled:opacity-50">+ Add</button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border rounded-md px-3 py-1.5 text-sm mb-4 w-64" />
      {byCat.length === 0 && <div className="text-sm text-neutral-400">No artifacts yet.</div>}
      {byCat.map((g) => (
        <div key={g.c} className="mb-5">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2">{g.c}</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.items.map((a) => (
              <div key={a.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{a.externalUrl ? <a href={a.externalUrl} target="_blank" rel="noreferrer" className="text-accent">{a.title}</a> : a.title}</div>
                  <button onClick={() => del(a.id)} className="text-red-400 text-xs">✕</button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)} className="border rounded px-1.5 py-0.5 text-[11px]">{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
