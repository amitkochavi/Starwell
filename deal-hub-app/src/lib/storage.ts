// Local-disk document storage (PRD C.1 / §H). Files live under DATA_DIR with
// SHA-256 dedupe; the original is always retained. On Vercel the serverless FS is
// ephemeral/read-only except /tmp — for production, swap this module for Vercel
// Blob / S3 (the interface stays the same). See README.
import { createHash } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');

export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function storeDealFile(dealId: string, filename: string, buf: Buffer): Promise<{ sha: string; path: string; size: number }> {
  const sha = sha256(buf);
  const dir = join(DATA_DIR, 'deals', dealId, 'docs');
  await mkdir(dir, { recursive: true });
  const safe = filename.replace(/[^\w.\-]+/g, '_');
  const path = join(dir, `${sha.slice(0, 12)}-${safe}`);
  await writeFile(path, buf);
  return { sha, path, size: buf.length };
}

export async function readStored(path: string): Promise<Buffer> {
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
