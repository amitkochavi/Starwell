'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ComparePicker({ deals }: { deals: { id: string; projectName: string; status: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const ids = Object.keys(sel).filter((k) => sel[k]);
  return (
    <div>
      <p className="text-sm text-neutral-500 mb-3">Pick 2–6 deals to compare side by side.</p>
      <div className="border rounded-lg divide-y max-w-lg">
        {deals.map((d) => (
          <label key={d.id} className="flex items-center gap-3 p-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={!!sel[d.id]} onChange={(e) => setSel({ ...sel, [d.id]: e.target.checked })} />
            <span className="flex-1">{d.projectName}</span><span className="text-xs text-neutral-400">{d.status}</span>
          </label>
        ))}
      </div>
      <button disabled={ids.length < 2 || ids.length > 6} onClick={() => router.push(`/compare?ids=${ids.join(',')}`)}
        className="mt-4 bg-ink text-white rounded-md px-4 py-2 text-sm disabled:opacity-40">Compare {ids.length || ''}</button>
    </div>
  );
}
