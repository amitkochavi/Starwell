/* Runs the browser engine under Node against a directory of Main DB CSVs,
   so the figures on the page can be asserted without a browser.

   Usage:  node tests/engine-node.js <csv-dir> [benchmark-json]

   The CSV directory holds one file per sheet, named after the sheet with
   anything but letters and digits replaced by an underscore. Nothing in this
   repository holds real balances: point it at a directory you keep outside
   the repository, which tests/snapshot_maindb.py can refill from Main DB. */

"use strict";
const fs = require("fs");
const path = require("path");

/* ---- the three globals the browser gives the engine --------------------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { data: [] };
  const head = rows[0];
  const data = rows.slice(1)
    .filter((r) => r.some((v) => String(v).trim() !== ""))
    .map((r) => { const o = {}; head.forEach((h, i) => { o[h] = r[i] === undefined ? "" : r[i]; }); return o; });
  return { data };
}

const listeners = [];
global.window = {
  Papa: { parse: (t) => parseCSV(t) },
  addEventListener: (ev, fn) => listeners.push([ev, fn]),
  innerWidth: 1440,
};
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, classList: { toggle() {}, add() {}, remove() {} },
                          addEventListener() {}, appendChild() {}, remove() {},
                          set innerHTML(v) {}, get firstElementChild() { return null; } }),
  body: { appendChild() {}, classList: { toggle() {} } },
};
global.fetch = () => Promise.reject(new Error("the engine must not fetch under Node"));

function loadBrowserScript(rel) {
  const code = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("window", "document", "fetch", code)(global.window, global.document, global.fetch);
}
loadBrowserScript("assets/hq-settings.js");
loadBrowserScript("assets/hq-dashboard.js");
loadBrowserScript("assets/hq-benchmarks.js");

const P = global.window.StarwellPortal;
const B = global.window.StarwellBenchmarks;

/* ---- read a directory of CSVs the way readMainDB reads the workbook ----- */
function slug(name) { return name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function loadDir(dir) {
  const tabs = {};
  const names = ["Accounts", "Statements", "Investment Ledger", "Distributions",
                 "20 Vitkin Street - APT #2", "Glaser Real Estate", "Jewelry",
                 "Liabilities", "Benchmarks", "Holdings"];
  names.forEach((n) => {
    const f = path.join(dir, slug(n) + ".csv");
    if (fs.existsSync(f)) tabs[n] = parseCSV(fs.readFileSync(f, "utf8")).data;
  });
  const need = names.slice(0, 7).filter((n) => !tabs[n]);
  if (need.length) throw new Error("missing sheets in " + dir + ": " + need.join(", "));
  return P.loadFrom(tabs);
}

module.exports = { P, B, loadDir, parseCSV, slug };

/* ---- run as a script: print what the page would show ------------------- */
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node tests/engine-node.js <csv-dir>"); process.exit(2); }
  const db = loadDir(dir);
  const M = P.build(db);
  const ASOF = P.fmt.toDate(M.latest);
  const ids = P.scopeAccounts(M);
  const T = P.totals(M, ASOF);
  const A = P.allocation(M, ids, ASOF);
  const y = P.periodChange(M, ids, new Date(Date.UTC(ASOF.getUTCFullYear() - 1, 11, 31)), ASOF);
  const m = P.periodChange(M, ids, P.util.prevMonthEnd(ASOF), ASOF);
  const out = {
    asOf: M.latest,
    underManagement: T.aum,
    capital: T.capital,
    accounts: T.accounts,
    la: T.la,
    realEstate: T.re,
    loan: T.loan,
    month: { gain: m.gain, ret: m.ret },
    ytd: { gain: y.gain, ret: y.ret },
    allocation: A.lines.map((l) => [l.label, l.value, l.share]),
    allocationTotal: A.total,
    currency: A.ccy.map((c) => [c.label, c.value, c.share]),
    irr: {},
    checks: M.checks.missing.concat(M.checks.dupes),
  };
  const decY = ASOF.getUTCMonth() >= 11 ? ASOF.getUTCFullYear() : ASOF.getUTCFullYear() - 1;
  ids.concat([["POOL", ids]]).forEach((x) => {
    const [name, accs] = Array.isArray(x) ? x : [x, [x]];
    out.irr[name] = [3, 5, 7].map((n) => P.deckIRR(M, accs, decY - n, decY));
  });
  console.log(JSON.stringify(out, null, 2));
}
