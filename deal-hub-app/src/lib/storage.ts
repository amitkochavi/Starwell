// Document storage adapter (PRD C.1 / §H).
// - Local disk for dev (DATA_DIR).
// - Vercel Blob in production (when BLOB_READ_WRITE_TOKEN is set) — Vercel's
//   serverless filesystem is ephemeral, so blob storage is required there.
// The interface (storeDealFile / readStored) is identical for both.
import { createHash } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function storeDealFile(dealId: string, filename: string, buf: Buffer): Promise<{ sha: string; path: string; size: number }> {
  const sha = sha256(buf);
  const safe = filename.replace(/[^\w.\-]+/g, '_');
  const key = `deals/${dealId}/docs/${sha.slice(0, 12)}-${safe}`;
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    const { url } = await put(key, buf, { access: 'public', contentType: mimeFor(filename) });
    return { sha, path: url, size: buf.length };
  }
  const dir = join(DATA_DIR, 'deals', dealId, 'docs');
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${sha.slice(0, 12)}-${safe}`);
  await writeFile(path, buf);
  return { sha, path, size: buf.length };
}

export async function readStored(path: string): Promise<Buffer> {
  if (/^https?:\/\//.test(path)) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path);
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  csv: 'text/csv', txt: 'text/plain', vtt: 'text/vtt', srt: 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export function mimeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME[ext] || 'application/octet-stream';
}
export function extOf(filename: string): string { return filename.split('.').pop()?.toLowerCase() || ''; }
