'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export default function CohortUploader({ dealId }: { dealId: string }) {
  const router = useRouter();
  const inp = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  async function onFile(f: File | undefined) {
    if (!f) return;
    setMsg(`Importing ${f.name}…`);
    const fd = new FormData(); fd.append('file', f);
    const res = await fetch(`/api/deals/${dealId}/cohort`, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Imported ${j.rows} rows / ${j.customers} customers.` : `Error: ${j.error || res.statusText}`);
    if (inp.current) inp.current.value = '';
    router.refresh();
  }
  return (
    <label className="inline-flex items-center gap-2 rounded-md border-2 border-dashed px-4 py-2 text-sm cursor-pointer hover:border-accent">
      ⬆ Upload customer file (CSV)
      <input ref={inp} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <span className="ml-2 text-xs text-neutral-500">{msg}</span>}
    </label>
  );
}
