'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export default function Uploader({ dealId }: { dealId: string }) {
  const router = useRouter();
  const inp = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      setMsg(`Uploading ${f.name}…`);
      const fd = new FormData();
      fd.append('file', f);
      fd.append('uploadedBy', 'amit@kochavii.com');
      const res = await fetch(`/api/deals/${dealId}/documents`, { method: 'POST', body: fd });
      if (res.status === 409) { const j = await res.json(); setMsg(`Skipped ${f.name} — ${j.error}`); }
      else if (!res.ok) { setMsg(`Failed ${f.name} — ${await res.text()}`); }
    }
    setMsg('Uploaded. Click “Process all documents” to run the pipeline.');
    setBusy(false);
    if (inp.current) inp.current.value = '';
    router.refresh();
  }

  return (
    <div>
      <label className={`inline-flex items-center gap-2 rounded-md border-2 border-dashed px-4 py-2 text-sm cursor-pointer ${busy ? 'opacity-50' : 'hover:border-accent'}`}>
        ⬆ Upload documents
        <input ref={inp} type="file" multiple hidden disabled={busy}
          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.png,.jpg,.jpeg,.txt,.vtt,.mp3,.m4a,.wav"
          onChange={(e) => onFiles(e.target.files)} />
      </label>
      {msg && <span className="ml-3 text-xs text-neutral-500">{msg}</span>}
    </div>
  );
}
