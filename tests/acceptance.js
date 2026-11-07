/* Starwell Portal acceptance tests.

   These run the engine the page actually ships, not a second implementation
   of it, so a figure can only pass here if it would also be right on screen.

   They assert against a saved copy of Main DB, never against the live
   workbook, so a change in the sheet cannot silently rewrite the expected
   answers and the live page is never frozen to match a test.

   The snapshot holds real balances and this repository is public, so it is
   kept in tests/fixtures-private, which .gitignore excludes. Refill it with:

       python3 tests/snapshot_maindb.py --out tests/fixtures-private/maindb-2026-11-05

   Run:  node tests/acceptance.js
*/

"use strict";
const fs = require("fs");
const path = require("path");
const { P, B, loadDir, parseCSV } = require("./engine-node.js");

const PRIVATE = path.join(__dirname, "fixtures-private");
const SNAP = path.join(PRIVATE, "maindb-2026-11-05");
const SNAP_LIAB = path.join(PRIVATE, "maindb-2026-11-05-with-liabilities");

let pass = 0, fail = 0, skipped = 0;
function ok(label, condition, detail) {
  if (condition) { pass++; console.log("PASS  " + label); }
  else { fail++; console.log("FAIL  " + label + (detail ? "   " + detail : "")); }
}
function near(label, got, want, tol) {
  const t = tol === undefined ? 0.02 : tol;
  const good = got !== null && got !== undefined && isFinite(got) && Math.abs(got - want) <= t;
  ok(label, good, `got ${fmt(got)}  want ${fmt(want)}  tol ${t}`);
}
function fmt(v) {
  if (v === null || v === undefined || !isFinite(v)) return String(v);
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
function section(name) { console.log("\n--- " + name + " ---"); }

/* ---------------------------------------------------------------- model -- */
function modelFrom(dir, mutate) {
  const db = loadDir(dir);
  if (mutate) mutate(db.tabs);
  const M = P.build(db);
  const asOf = P.fmt.toDate(M.latest);
  const ids = P.scopeAccounts(M);
  return { M, asOf, ids, db };
}
function ytd(M, ids, asOf) {
  return P.periodChange(M, ids, new Date(Date.UTC(asOf.getUTCFullYear() - 1, 11, 31)), asOf);
}

if (!fs.existsSync(SNAP)) {
  console.log("SKIP  no Main DB snapshot at " + SNAP);
  console.log("      python3 tests/snapshot_maindb.py --out " + SNAP);
  process.exit(2);
}

/* =========================================================================
   1. The figures the quarterly review reports, against the snapshot that
      carries the Liabilities sheet. Every one of these was an acceptance
      test before this release and still is.
   ========================================================================= */
if (!fs.existsSync(SNAP_LIAB)) {
  console.log("SKIP  no with-liabilities snapshot at " + SNAP_LIAB);
  skipped++;
} else {
  section("Reported figures, Starwell view at the reporting date");
  const { M, asOf, ids } = modelFrom(SNAP_LIAB);
  const T = P.totals(M, asOf);
  const y = ytd(M, ids, asOf);
  const m = P.periodChange(M, ids, P.util.prevMonthEnd(asOf), asOf);

  ok("reporting date is read from Main DB, not typed", M.latest === "2026-10-31", "got " + M.latest);
  ok("the Starwell view holds 7 accounts", ids.length === 7, "got " + ids.length);
  near("7 accounts", T.accounts, 10196475.15);
  near("FIBI loan", T.loan, -12139.42);

  const byName = {};
  M.la.forEach((f) => { byName[f.name] = f.value; });
  near("  L&A: Pioneers", byName["Legion Holdings"], 100000.0);
  near("  L&A: Kodiak", byName["Kodiak Fund I, L.P. (via L&A Holdings)"], 20000.0);
  near("  L&A: Terminal", byName["Terminal Logistics Fund II"], 47274.79);
  near("  L&A: Dawson", byName["Wilpon & Co."], 99206.35);
  near("  L&A: cash", M.laCash, 4215.6);
  near("L&A Holdings", T.la, 270696.74);
  near("  Vitkin", M.vit, 1976415.05);
  near("  Phoenix (Owned only)", M.props.reduce((s, p) => s + p.value, 0), 536500.0);
  near("Real estate", T.re, 2512915.05);
  near("Under management", T.aum, 12967947.52);
  near("October 2026 gain", m.gain, -202141.96, 0.05);
  near("October 2026 return %", m.ret * 100, -1.94, 0.01);
  near("YTD gain to 31 Oct", y.gain, 1080503.73, 0.05);
  near("YTD return %", y.ret * 100, 13.26, 0.02);

  ok("the sold Malibu condo is left out of real estate",
     M.soldProps.some((p) => /malibu/i.test(p.name)) && !M.props.some((p) => /malibu/i.test(p.name)));

  /* ---- allocation, by asset and not by account --------------------------- */
  section("Allocation");
  const A = P.allocation(M, ids, asOf);
  const line = (l) => A.lines.find((x) => x.label.indexOf(l) === 0);
  near("Listed securities, US", line("Listed securities, US").value, 9644873.0, 1);
  near("  its share", line("Listed securities, US").share * 100, 74.4, 0.05);
  near("FIBI *4390, net of loan", line("FIBI *4390").value, 429796.06, 1);
  near("  its share", line("FIBI *4390").share * 100, 3.3, 0.05);
  near("Cash, FIBI *852 plus L&A cash", line("Cash").value, 113882.27, 1);
  near("  its share", line("Cash").share * 100, 0.9, 0.05);
  near("Private funds", line("Private funds").value, 266481.14, 1);
  near("  its share", line("Private funds").share * 100, 2.0, 0.05);
  near("Real estate", line("Real estate").value, 2512915.05, 1);
  near("  its share", line("Real estate").share * 100, 19.4, 0.05);
  near("Allocation total", A.total, 12967947.52);
  ok("FIBI *852 is cash, not listed securities",
     M.accounts.FIBI_852.assetClass === "cash" && line("Listed securities, US").value < 9700000);

  const sum = A.lines.reduce((s, l) => s + l.share, 0);
  ok("the asset shares foot to exactly 100.0%", Math.abs(sum - 1) < 1e-9, "got " + (sum * 100).toFixed(4) + "%");
  const csum = A.ccy.reduce((s, c) => s + c.share, 0);
  ok("the currency shares foot to exactly 100.0%", Math.abs(csum - 1) < 1e-9, "got " + (csum * 100).toFixed(4) + "%");

  section("Currency, measured on the asset and not the account");
  near("USD", A.ccy[0].value, 10452069.74, 1);
  near("  its share", A.ccy[0].share * 100, 80.6, 0.05);
  near("ILS", A.ccy[1].value, 2515877.78, 1);
  near("  its share", A.ccy[1].share * 100, 19.4, 0.05);
  ok("the Tel Aviv apartment counts as a shekel asset", A.ccy[1].value > M.vit);

  /* ---- the deck's money-weighted method ---------------------------------- */
  section("Money-weighted return, the quarterly deck's method");
  const irr = (accs, yrs) => P.deckIRR(M, accs, 2025 - yrs, 2025);
  near("Schwab *0687, 3 years", irr(["SCHWAB_0687"], 3) * 100, 28.9, 0.1);
  near("Schwab *0687, 5 years", irr(["SCHWAB_0687"], 5) * 100, 15.0, 0.1);
  near("City National *5020, 3 years", irr(["CNB_48101310"], 3) * 100, 17.2, 0.1);
  near("City National *5020, 5 years", irr(["CNB_48101310"], 5) * 100, 7.9, 0.1);
  near("Schwab *1558, 3 years", irr(["SCHWAB_1558"], 3) * 100, 23.9, 0.1);
  near("Schwab *1558, 5 years", irr(["SCHWAB_1558"], 5) * 100, 13.4, 0.1);
  near("City National *2010, 3 years", irr(["CNB_48492010"], 3) * 100, 17.1, 0.1);
  near("City National *2010, 5 years", irr(["CNB_48492010"], 5) * 100, 9.1, 0.1);
  near("Pool, 3 years", irr(ids, 3) * 100, 21.6, 0.1);
  near("Pool, 5 years", irr(ids, 5) * 100, 11.2, 0.1);
  near("Pool, 7 years", irr(ids, 7) * 100, 12.0, 0.1);
  const exFibi = ids.filter((id) => id.indexOf("FIBI") !== 0);
  near("Pool excluding FIBI, 3 years", irr(exFibi, 3) * 100, 20.2, 0.1);
  near("Pool excluding FIBI, 5 years", irr(exFibi, 5) * 100, 10.7, 0.1);

  /* ---- leverage ---------------------------------------------------------- */
  section("Leverage");
  const marg = M.liabilityFor("SCHWAB_0687");
  ok("the Schwab margin loan is read from the Liabilities sheet", !!marg);
  near("  its balance", marg.usd, 52396.91);
  near("  its rate", marg.rate * 100, 10.625, 0.001);
  ok("  it is not deducted twice, the statement already nets it", marg.netted === true);
  const fibi = M.liabilityFor("FIBI_314390");
  near("the FIBI loan converts at the rate on its own row", fibi.usd, 12139.42, 0.01);
  ok("  its balance is in shekels", fibi.ccy === "ILS" && Math.abs(fibi.bal - 37632.19) < 0.01);
}

/* =========================================================================
   2. The snapshot as Main DB actually stands: no Liabilities sheet. The page
      must say so and raise a check, and must not substitute a typed figure.
   ========================================================================= */
section("No Liabilities sheet: nothing is assumed in its place");
{
  const { M, asOf, ids } = modelFrom(SNAP);
  const T = P.totals(M, asOf);
  ok("no loan is deducted", T.loan === 0);
  ok("a data check says the sheet is missing",
     M.checks.missing.some((m) => /Liabilities/.test(m)));
  ok("no typed loan leaks into under management", Math.abs(T.aum - 12980086.94) < 0.05,
     "got " + fmt(T.aum));
  ok("a missing Commitment column is reported, not guessed",
     !M.hasCommitment && M.checks.missing.some((m) => /Commitment/.test(m)) &&
     M.la.every((f) => f.commitment === null));
  const A = P.allocation(M, ids, asOf);
  ok("allocation still foots to 100.0% without the loan",
     Math.abs(A.lines.reduce((s, l) => s + l.share, 0) - 1) < 1e-9);
}

/* =========================================================================
   3. Change tests: a modified copy of the snapshot must move the figures by
      exactly the amount it changed, and by nothing else.
   ========================================================================= */
section("Change tests on modified copies of the snapshot");

/* (a) +$10,000 on SCHWAB_0687 at 31 Oct */
{
  const base = modelFrom(SNAP_LIAB_OR(SNAP));
  const b = { T: P.totals(base.M, base.asOf), y: ytd(base.M, base.ids, base.asOf),
              m: P.periodChange(base.M, base.ids, P.util.prevMonthEnd(base.asOf), base.asOf),
              A: P.allocation(base.M, base.ids, base.asOf),
              v: base.M.valueAt("SCHWAB_0687", base.asOf).usd };
  const mod = modelFrom(SNAP_LIAB_OR(SNAP), (tabs) => {
    tabs.Statements.rows.forEach((r) => {
      if (r.AccountID === "SCHWAB_0687" && r.StatementDate === "2026-10-31") {
        /* Main DB stores these as currency text, so the engine's own parser
           is used rather than Number(), which would read "$1,396,237.94" as
           not a number and silently zero the account. */
        r.EndingValueUSD = String(P.fmt.num(r.EndingValueUSD) + 10000);
      }
    });
  });
  const a = { T: P.totals(mod.M, mod.asOf), y: ytd(mod.M, mod.ids, mod.asOf),
              m: P.periodChange(mod.M, mod.ids, P.util.prevMonthEnd(mod.asOf), mod.asOf),
              A: P.allocation(mod.M, mod.ids, mod.asOf),
              v: mod.M.valueAt("SCHWAB_0687", mod.asOf).usd };
  near("(a) the account in the Accounts table moves by 10,000", a.v - b.v, 10000, 0.01);
  near("(a) under management moves by 10,000", a.T.aum - b.T.aum, 10000, 0.01);
  near("(a) the October change moves by 10,000", a.m.gain - b.m.gain, 10000, 0.01);
  near("(a) the year to date moves by 10,000", a.y.gain - b.y.gain, 10000, 0.01);
  near("(a) allocation moves by 10,000, all of it in listed securities",
       a.A.lines[0].value - b.A.lines[0].value, 10000, 0.01);
  near("(a) and the allocation total moves by 10,000", a.A.total - b.A.total, 10000, 0.01);
}

/* (b) a 30 November statement for every account */
{
  const mod = modelFrom(SNAP_LIAB_OR(SNAP), (tabs) => {
    const ids = Array.from(new Set(tabs.Statements.rows.map((r) => r.AccountID))).filter(Boolean);
    ids.forEach((id) => {
      const last = tabs.Statements.rows.filter((r) => r.AccountID === id)
        .sort((x, z) => (x.StatementDate < z.StatementDate ? 1 : -1))[0];
      if (!last) return;
      const row = Object.assign({}, last);
      row.StatementDate = "2026-11-30";
      row.Additions = "0"; row.Withdrawals = "0";
      tabs.Statements.rows.push(row);
    });
  });
  ok("(b) the reporting date follows Main DB to 2026-11-30", mod.M.latest === "2026-11-30",
     "got " + mod.M.latest);
  const series = P.monthSeries(mod.M, mod.ids, new Date(Date.UTC(2025, 11, 31)), mod.asOf);
  const last = series[series.length - 1];
  /* FIBI *852 had stopped reporting after September, so giving it a November
     statement makes it a reporting account again and October is then a month
     it is missing. The engine merges the two rather than interpolating, which
     is the behaviour we want; what matters is that November is in the table
     and the period ends on the new reporting date. */
  ok("(b) November appears in the monthly table",
     /Nov 26$/.test(last.label) && P.fmt.iso(last.to) === "2026-11-30",
     series.map((s) => s.label).join(", "));
  const y = ytd(mod.M, mod.ids, mod.asOf);
  ok("(b) the year to date now runs to 30 November", P.fmt.iso(mod.asOf) === "2026-11-30" && y.end > 0);
}

/* (c) a different FIBI loan balance */
if (fs.existsSync(SNAP_LIAB)) {
  const base = modelFrom(SNAP_LIAB);
  const bT = P.totals(base.M, base.asOf);
  const bA = P.allocation(base.M, base.ids, base.asOf);
  const delta = 10000;                      // shekels
  const mod = modelFrom(SNAP_LIAB, (tabs) => {
    tabs.Liabilities.rows.forEach((r) => {
      if (r.AccountID === "FIBI_314390") r.Balance = String(Number(r.Balance) + delta);
    });
  });
  const aT = P.totals(mod.M, mod.asOf);
  const aA = P.allocation(mod.M, mod.ids, mod.asOf);
  const usd = delta * 0.3225806452;
  near("(c) capital falls by the loan change at that row's rate", bT.capital - aT.capital, usd, 0.01);
  near("(c) under management falls by the same", bT.aum - aT.aum, usd, 0.01);
  const fb = bA.lines.find((l) => l.label.indexOf("FIBI *4390") === 0);
  const fa = aA.lines.find((l) => l.label.indexOf("FIBI *4390") === 0);
  near("(c) the FIBI net line falls by the same", fb.value - fa.value, usd, 0.01);
  near("(c) and nothing else moves", (bA.total - aA.total) - usd, 0, 0.01);
}

/* (d) a month removed for one account */
{
  const base = modelFrom(SNAP_LIAB_OR(SNAP));
  const bSeries = P.monthSeries(base.M, base.ids, new Date(Date.UTC(2025, 11, 31)), base.asOf);
  const mod = modelFrom(SNAP_LIAB_OR(SNAP), (tabs) => {
    tabs.Statements.rows = tabs.Statements.rows.filter(
      (r) => !(r.AccountID === "SCHWAB_1558" && r.StatementDate === "2026-07-31"));
  });
  const aSeries = P.monthSeries(mod.M, mod.ids, new Date(Date.UTC(2025, 11, 31)), mod.asOf);
  ok("(d) the months merge where the statement is gone",
     aSeries.length === bSeries.length - 1 && aSeries.some((s) => s.merged),
     "before " + bSeries.length + " periods, after " + aSeries.length);
  ok("(d) the merged period is labelled Jul-Aug 26",
     aSeries.some((s) => s.label === "Jul-Aug 26"), aSeries.map((s) => s.label).join(", "));
  const cov = P.coverage(mod.M, mod.ids, "2026-01-31");
  const row = cov.rows.find((r) => r.id === "SCHWAB_1558");
  const i = cov.months.indexOf("2026-07-31");
  ok("(d) the coverage grid shows the gap", row.cells[i] === "no", "cell is " + row.cells[i]);
}

/* (e) a return of capital distribution */
{
  const base = modelFrom(SNAP_LIAB_OR(SNAP));
  const bVal = base.M.la.find((f) => f.name === "Wilpon & Co.").value;
  const bT = P.totals(base.M, base.asOf);
  const mod = modelFrom(SNAP_LIAB_OR(SNAP), (tabs) => {
    const row = Object.assign({}, tabs.Distributions.rows[0]);
    row.Date = "2026-11-30";
    row.Fund = "91 Somerset Club JV, LLC (The Dawson)";
    row.Treatment = "Return of capital";
    row["Amit Amount"] = "5000";
    tabs.Distributions.rows.push(row);
  });
  const aVal = mod.M.la.find((f) => f.name === "Wilpon & Co.").value;
  const aT = P.totals(mod.M, mod.asOf);
  near("(e) the fund's carrying value falls by Amit's amount", bVal - aVal, 5000, 0.01);
  near("(e) and L&A Holdings falls by the same", bT.la - aT.la, 5000, 0.01);
}

function SNAP_LIAB_OR(fallback) { return fs.existsSync(SNAP_LIAB) ? SNAP_LIAB : fallback; }

/* =========================================================================
   4. Benchmarks, from the saved fixture and never from the live feed.
   ========================================================================= */
async function benchmarks() {
  section("Benchmarks, from the saved fixture");
  const bf = path.join(__dirname, "fixtures", "Benchmarks.csv");
  if (!fs.existsSync(bf)) { console.log("SKIP  no benchmark fixture at " + bf); skipped++; return; }

  const { M } = modelFrom(SNAP_LIAB_OR(SNAP), (tabs) => {
    tabs.Benchmarks = { name: "Benchmarks", rows: parseCSV(fs.readFileSync(bf, "utf8")).data };
  });
  /* null for the Supabase client: the fixture must be the only source, so a
     test can never reach a live feed. */
  const pack = await B.load(M, null);
  const s = pack && pack.series;
  ok("the Benchmarks sheet overrides the feed", !!s && !!s.SP500,
     pack ? "source " + pack.source : "nothing loaded");
  if (!s || !s.SP500) return;

  near("S&P 500, calendar 2023", B.calendarYear(s.SP500, 2023) * 100, 26.25, 0.3);
  near("S&P 500, calendar 2024", B.calendarYear(s.SP500, 2024) * 100, 24.95, 0.3);
  near("S&P 500, calendar 2025", B.calendarYear(s.SP500, 2025) * 100, 17.8, 0.3);
  near("S&P 500, 3 years to Dec 2025, annualised",
       B.annRet(s.SP500, "2022-12-31", "2025-12-31") * 100, 23.0, 0.3);
  near("S&P 500, 5 years to Dec 2025, annualised",
       B.annRet(s.SP500, "2020-12-31", "2025-12-31") * 100, 14.4, 0.3);
  ok("the global 60/40 blend is built from its components, not stored",
     !!s.G6040 && s.G6040.length > 12);
  ok("the blend sits between its components over a long window", (function () {
    if (!s.G6040 || !s.ACWI || !s.AGG) return false;
    const a = B.ret(s.ACWI, "2020-12-31", "2025-12-31");
    const b = B.ret(s.AGG, "2020-12-31", "2025-12-31");
    const g = B.ret(s.G6040, "2020-12-31", "2025-12-31");
    return g > Math.min(a, b) && g < Math.max(a, b);
  })());
  ok("TA-125 is converted to dollars, never left in shekels",
     !!s.TA125 && s.TA125[s.TA125.length - 1].level < 2000);

  const { M: M2, asOf, ids } = modelFrom(SNAP_LIAB_OR(SNAP));
  const tw = B.poolTWR(M2, ids, new Date(Date.UTC(2025, 11, 31)), asOf);
  ok("the pool's own return is time-weighted and chained",
     tw.ret !== null && tw.method.indexOf("monthly") >= 0, "method: " + tw.method);
  ok("the long windows fall back to calendar years, as Main DB only has year ends",
     B.poolTWR(M2, ids, new Date(Date.UTC(2020, 11, 31)), asOf).method.indexOf("calendar year") >= 0);
  ok("the time-weighted return differs from the money-weighted one, so the two are not confused",
     Math.abs(tw.ret - P.deckIRR(M2, ids, 2025, 2025)) > 1e-6 || P.deckIRR(M2, ids, 2025, 2025) === null);
}

benchmarks().then(() => {
  console.log(`\n${pass}/${pass + fail} passed` + (skipped ? `, ${skipped} skipped` : ""));
  process.exit(fail ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
