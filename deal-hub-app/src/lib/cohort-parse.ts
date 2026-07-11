// Deterministic customer-file importer (B.19). Handles both a LONG format
// (customer, year, revenue) and a WIDE pivot (customer + one column per year).
import type { CustomerYear } from './cohort';

function parseCSV(text: string): string[][] {
  return text.split(/\r?\n/).filter((l) => l.trim() !== '').map((line) => {
    const out: string[] = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map((s) => s.trim());
  });
}
const num = (s: string) => { const n = Number(String(s).replace(/[$,%"\s]/g, '')); return Number.isNaN(n) ? 0 : n; };

export function parseCustomerFile(text: string): CustomerYear[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  const rev = header.findIndex((h) => /revenue|amount|value|\$/.test(h));
  const yr = header.findIndex((h) => /^year$/.test(h));
  const cust = header.findIndex((h) => /customer|client|account|name/.test(h));

  // LONG: has explicit year + revenue columns
  if (yr >= 0 && rev >= 0) {
    const cIdx = cust >= 0 ? cust : 0;
    return rows.slice(1).map((r) => ({ customer: r[cIdx] || '—', year: Math.round(num(r[yr])), revenue: num(r[rev]) }))
      .filter((r) => r.customer && r.year);
  }

  // WIDE pivot: first column = customer, remaining headers = years
  const cIdx = cust >= 0 ? cust : 0;
  const yearCols: { idx: number; year: number }[] = [];
  rows[0].forEach((h, i) => { if (i === cIdx) return; const m = h.match(/(19|20)\d{2}/); if (m) yearCols.push({ idx: i, year: Number(m[0]) }); });
  const out: CustomerYear[] = [];
  for (const r of rows.slice(1)) {
    const customer = r[cIdx]; if (!customer) continue;
    for (const yc of yearCols) { const v = num(r[yc.idx] || ''); if (v) out.push({ customer, year: yc.year, revenue: v }); }
  }
  return out;
}
