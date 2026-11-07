/* Starwell Portal — the Dashboard view of Starwell HQ.

   Reads Main DB (published Google Sheet) once per session, keeps it in memory,
   and derives every figure on the page from it. Nothing is written back.

   No figure is typed into this file. Balances, flows, returns, loans,
   commitments, FX rates, reporting dates and labels all come from Main DB at
   run time. The conventions and thresholds the calculations use live in
   assets/hq-settings.js and are listed to the reader on the page.

   Where Main DB does not carry something the page needs, the page says
   "Not in Main DB" and raises a data check. It never falls back to a number
   held in the code.

   SECURITY: see the note at the top of assets/hq-settings.js. */

window.StarwellPortal = (function () {
  "use strict";

  var CFG = window.STARWELL_SETTINGS;

  function conv(key) {
    for (var i = 0; i < CFG.conventions.length; i++) if (CFG.conventions[i].key === key) return CFG.conventions[i].value;
    throw new Error("unknown convention " + key);
  }
  function thr(key) {
    for (var i = 0; i < CFG.thresholds.length; i++) if (CFG.thresholds[i].key === key) return CFG.thresholds[i].value;
    throw new Error("unknown threshold " + key);
  }
  var FLOW_LAG = conv("flowLagDays");
  var DAY_COUNT = conv("dayCount");
  var IRR_FLOW_MONTH = conv("irrFlowMonth");

  var cache = null;      // one read per session
  var state = {
    scope: "starwell", period: "ytd", ccy: "USD", group: "pool", pick: null,
    chartLine: "gain",   // "gain" = cumulative investment gain, "value" = month-end value
    bench: ["SP500", "ACWI"],
    asAt: null           // a frozen quarter, or null for live
  };

  /* ---------------------------------------------------------------- utils */
  function num(v) {
    if (v === null || v === undefined) return 0;
    var s = String(v).replace(/[^0-9.\-]/g, "");
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  function hasNum(v) {
    if (v === null || v === undefined) return false;
    var s = String(v).trim();
    if (!s) return false;
    return /[0-9]/.test(s);
  }
  /* Main DB mixes ISO dates in Statements with M/D/YYYY in Distributions. */
  function toDate(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
    return null;
  }
  function iso(d) { return d ? d.toISOString().slice(0, 10) : ""; }
  function days(a, b) { return Math.round((b - a) / 86400000); }
  function monthEnd(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); }
  function prevMonthEnd(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)); }
  function addMonthEnd(d, n) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1 + n, 0)); }
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function mLabel(d) { return MON[d.getUTCMonth()] + " " + String(d.getUTCFullYear()).slice(2); }
  function mLong(d) { return MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }

  var MINUS = "−";
  function sign(n) { return n < 0 ? MINUS : ""; }
  function signed(n) { return n < 0 ? MINUS : n > 0 ? "+" : ""; }
  function cvt(n) { return state.ccy === "ILS" ? n * (state.fxRate || 1) : n; }
  function cur() { return state.ccy === "ILS" ? "₪" : "$"; }

  function big(n) {              /* the headline figures, two significant decimals */
    var v = cvt(n), a = Math.abs(v);
    if (a >= 1e6) return sign(v) + cur() + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return sign(v) + cur() + Math.round(a / 1e3) + "K";
    return sign(v) + cur() + a.toFixed(0);
  }
  function bigSigned(n) {        /* "+$1.08M" / "−$202.1K" */
    var v = cvt(n), a = Math.abs(v);
    if (a >= 1e6) return signed(v) + cur() + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return signed(v) + cur() + (a / 1e3).toFixed(1) + "K";
    return signed(v) + cur() + a.toFixed(0);
  }
  function axis(n) {             /* chart axes: "$3.0M", "$500K", no decimals under 1M */
    var v = cvt(n), a = Math.abs(v);
    if (a >= 1e6) return sign(v) + cur() + (a / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return sign(v) + cur() + Math.round(a / 1e3) + "K";
    return sign(v) + cur() + Math.round(a);
  }
  function k1(n) {               /* tables run in thousands, one decimal */
    var v = cvt(n);
    return sign(v) + cur() + Math.abs(v / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function full(n) {             /* data checks quote the amount in full */
    return sign(n) + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n, dp) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    return sign(n) + Math.abs(n * 100).toFixed(dp === undefined ? 2 : dp) + "%";
  }
  function pctSigned(n, dp) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    return signed(n) + Math.abs(n * 100).toFixed(dp === undefined ? 2 : dp) + "%";
  }
  function pts(n, dp) {          /* a difference in percentage points */
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    return signed(n) + Math.abs(n * 100).toFixed(dp === undefined ? 1 : dp);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(id) { return document.getElementById(id); }

  /* Largest remainder, so a column of shares foots to exactly 100.0%.
     Takes the parts, returns each one's share rounded to dp decimals. */
  function shares(parts, total, dp) {
    var f = Math.pow(10, dp === undefined ? 1 : dp);
    var target = Math.round(100 * f);
    if (!total) return parts.map(function () { return null; });
    var raw = parts.map(function (p) { return (p / total) * 100 * f; });
    var floor = raw.map(function (r) { return Math.floor(r); });
    var used = floor.reduce(function (s, v) { return s + v; }, 0);
    var left = target - used;
    var order = raw.map(function (r, i) { return { i: i, rem: r - Math.floor(r) }; })
                   .sort(function (a, b) { return b.rem - a.rem; });
    for (var k = 0; k < order.length && left > 0; k++, left--) floor[order[k].i] += 1;
    for (var j = order.length - 1; j >= 0 && left < 0; j--, left++) floor[order[j].i] -= 1;
    return floor.map(function (v) { return v / f / 100; });
  }

  /* ------------------------------------------------------------ read ----- */
  function fetchText(url) {
    return fetch(url, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " from Main DB");
      return r.text();
    });
  }
  function parseCSV(text) {
    return window.Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  }
  /* Header names only: never column position, never row order. */
  function col(row, want) {
    var keys = Object.keys(row), i, k;
    var target = want.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (i = 0; i < keys.length; i++) {
      k = String(keys[i]).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (k === target) return row[keys[i]];
    }
    return undefined;
  }
  function hasCol(rows, want) {
    if (!rows || !rows.length) return false;
    return col(rows[0], want) !== undefined;
  }

  var REQUIRED = ["Accounts", "Statements", "Investment Ledger", "Distributions",
                  "20 Vitkin Street - APT #2", "Glaser Real Estate", "Jewelry"];
  var OPTIONAL = ["Liabilities", "Benchmarks", "Holdings"];

  function readMainDB() {
    if (cache) return Promise.resolve(cache);
    var base = CFG.mainDbPubUrl.replace(/\/$/, "");
    return fetchText(base + "/pubhtml").then(function (html) {
      var names = [], gids = [], re = /\{name:\s*"(.*?)"/g, rg = /gid:\s*"?(\d+)"?/g, m;
      while ((m = re.exec(html))) names.push(m[1]);
      while ((m = rg.exec(html))) gids.push(m[1]);
      if (!names.length || names.length !== gids.length) {
        var li = /<li[^>]*>\s*<a[^>]*href=["']?#gid=(\d+)["']?[^>]*>([^<]+)<\/a>/gi;
        names = []; gids = [];
        while ((m = li.exec(html))) { gids.push(m[1]); names.push(m[2]); }
      }
      if (!names.length) throw new Error("no sheet tabs found at the published workbook URL");
      /* match tab names loosely so a rename or a stray space cannot drop one */
      function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
      function gidFor(want) {
        var t = norm(want);
        for (var i = 0; i < names.length; i++) if (norm(names[i]) === t) return gids[i];
        return null;
      }
      var missing = REQUIRED.filter(function (n) { return !gidFor(n); });
      if (missing.length) throw new Error("sheets not found in Main DB: " + missing.join(", "));
      var want = REQUIRED.concat(OPTIONAL.filter(function (n) { return gidFor(n); }));
      return Promise.all(want.map(function (n) {
        return fetchText(base + "/pub?gid=" + gidFor(n) + "&single=true&output=csv")
          .then(function (t) { return { name: n, rows: parseCSV(t), raw: t }; });
      }));
    }).then(function (tabs) {
      var by = {}; tabs.forEach(function (t) { by[t.name] = t; });
      cache = { tabs: by, readAt: new Date(), log: tabs.map(function (t) { return t.name + ": " + t.rows.length + " rows"; }) };
      return cache;
    });
  }
  /* Tests and the offline harness hand the workbook in directly. */
  function loadFrom(tabsByName) {
    var by = {};
    Object.keys(tabsByName).forEach(function (n) {
      by[n] = { name: n, rows: tabsByName[n] };
    });
    cache = { tabs: by, readAt: new Date(), log: Object.keys(by).map(function (n) { return n + ": " + by[n].rows.length + " rows"; }) };
    return cache;
  }

  /* --------------------------------------------------------- model ------- */
  function build(db) {
    var checks = { dupes: [], stale: [], gaps: [], notes: [], missing: [] };
    function want(msg) { checks.missing.push(msg); }

    var accountsSheet = db.tabs["Accounts"].rows;
    var accounts = {};
    accountsSheet.forEach(function (r) {
      var id = String(col(r, "AccountID") || "").trim();
      if (!id) return;
      var set = CFG.accounts[id] || {};
      accounts[id] = {
        id: id,
        inst: col(r, "Institution") || "",
        name: col(r, "AccountName") || "",
        mask: col(r, "AccountNumberMasked") || "",
        owner: String(col(r, "Owner") || "").trim(),
        ccy: String(col(r, "Currency") || "USD").trim().toUpperCase(),
        /* a DisplayName column on the sheet wins over the settings label */
        label: String(col(r, "DisplayName") || "").trim() || set.label ||
               ((col(r, "Institution") || "") + " · " + (col(r, "AccountName") || id)),
        group: set.group || "OTHER",
        assetClass: set.assetClass || "listed"
      };
    });

    /* Statements: key is AccountID + StatementDate, first wins, never summed */
    var byAcct = {};
    db.tabs["Statements"].rows.forEach(function (r) {
      var id = String(col(r, "AccountID") || "").trim(), d = toDate(col(r, "StatementDate"));
      if (!id || !d) return;
      byAcct[id] = byAcct[id] || {};
      var key = iso(d);
      if (byAcct[id][key]) {
        checks.dupes.push(id + " " + key + ": kept " + full(byAcct[id][key].usd) +
                          ", ignored " + full(num(col(r, "EndingValueUSD"))));
        return;
      }
      byAcct[id][key] = {
        date: d,
        usd: num(col(r, "EndingValueUSD")),
        local: num(col(r, "EndingValue")),
        fx: num(col(r, "FXRateToUSD")),
        add: num(col(r, "Additions")),
        wd: num(col(r, "Withdrawals")),
        note: String(col(r, "Notes") || "")
      };
      var nt = byAcct[id][key].note;
      if (/\bopen\b|confirm/i.test(nt)) checks.notes.push(id + " " + key + ": " + nt.slice(0, 150));
    });
    Object.keys(byAcct).forEach(function (id) {
      accounts[id] = accounts[id] || { id: id, owner: "", inst: "", name: id, mask: "", ccy: "USD",
                                       label: id, group: "OTHER", assetClass: "listed" };
      accounts[id].dates = Object.keys(byAcct[id]).sort();
    });

    function valueAt(id, on) {
      var ds = (accounts[id] && accounts[id].dates) || [], k = null, t = iso(on), i;
      for (i = 0; i < ds.length; i++) if (ds[i] <= t) k = ds[i];
      return k ? { usd: byAcct[id][k].usd, local: byAcct[id][k].local, fx: byAcct[id][k].fx, at: k } : { usd: 0, at: null };
    }
    function started(id, on) { return valueAt(id, on).at !== null; }

    /* Main DB does not always record the transfer that opens an account: the
       first statement shows a balance with nothing in Additions to match it.
       Left alone that balance reads as investment gain in whatever period the
       account first appears, which once put a single year at +176%. Where the
       recorded net flow is below openingFlowRatio of the opening balance, the
       difference is taken for the transfer it must be, and a data check says
       so. Where Additions do carry the transfer, as they do for the account
       opened in March 2026, nothing is changed. */
    var openRatio = thr("openingFlowRatio");
    var openFlow = {};
    checks.opening = {};
    Object.keys(byAcct).forEach(function (id) {
      var ds = accounts[id].dates || [];
      if (!ds.length) return;
      var s = byAcct[id][ds[0]];
      var net = s.add - s.wd;
      if (!s.usd || s.usd < 0 || net >= s.usd * openRatio) return;
      openFlow[id] = { at: ds[0], date: s.date, amount: s.usd - net };
      /* kept per account so the page can list only the ones in view */
      checks.opening[id] = id + " " + ds[0] + ": opens at " + full(s.usd) +
        " with " + full(net) + " in recorded flows, so the balance is counted as a transfer in, not as gain";
    });

    function flowsIn(id, from, to) {
      var out = [], ds = (accounts[id] && accounts[id].dates) || [];
      var op = openFlow[id];
      ds.forEach(function (k) {
        var s = byAcct[id][k];
        if (s.date > from && s.date <= to) {
          var extra = (op && op.at === k) ? op.amount : 0;
          var net = s.add - s.wd + extra;
          if (net) out.push({ date: s.date, net: net, add: s.add + extra, wd: s.wd });
        }
      });
      return out;
    }

    /* ---- the reporting date: the latest statement in Main DB, never typed */
    var latest = null;
    Object.keys(byAcct).forEach(function (id) {
      Object.keys(byAcct[id]).forEach(function (k) { if (!latest || k > latest) latest = k; });
    });

    /* ---- FX, read off the statement rows that carry a rate --------------- */
    /* FXRateToUSD on an ILS account is USD per ILS. The display toggle needs
       ILS per USD, so it is inverted. The rate used is the latest one in Main
       DB on or before the reporting date. */
    function ilsPerUsdAt(onIso) {
      var best = null;
      Object.keys(byAcct).forEach(function (id) {
        if ((accounts[id] || {}).ccy !== "ILS") return;
        Object.keys(byAcct[id]).forEach(function (k) {
          var s = byAcct[id][k];
          if (!s.fx || s.fx === 1) return;
          if (onIso && k > onIso) return;
          if (!best || k > best.at) best = { at: k, rate: 1 / s.fx, from: id };
        });
      });
      return best;
    }
    var fx = ilsPerUsdAt(latest);
    if (!fx) want("No FX rate in Main DB: no ILS account statement carries an FXRateToUSD, so figures cannot be shown in shekels.");

    /* ------- liabilities: the FIBI loan, the Schwab margin loan ----------- */
    /* Optional "Liabilities" sheet: AccountID, Date, Balance, Currency,
       FXRateToUSD, Rate, Notes. Without it the page says so and raises a
       check. It never falls back to a figure held in the code. */
    var liabilities = [], liabilitiesSheet = !!db.tabs["Liabilities"];
    if (liabilitiesSheet) {
      var seen = {};
      db.tabs["Liabilities"].rows.forEach(function (r) {
        var id = String(col(r, "AccountID") || "").trim();
        var d = toDate(col(r, "Date"));
        if (!id || !d) return;
        var bal = num(col(r, "Balance"));
        var ccy = String(col(r, "Currency") || "USD").trim().toUpperCase();
        var rate = col(r, "FXRateToUSD");
        var usd;
        if (ccy === "USD") usd = bal;
        else if (hasNum(rate)) usd = bal * num(rate);
        else {
          want("Liabilities row " + id + " " + iso(d) + " is in " + ccy + " with no FXRateToUSD, so it is left out of the figures.");
          return;
        }
        var prev = seen[id];
        if (prev && prev.at >= iso(d)) return;      // keep the latest per account
        var row = { id: id, at: iso(d), date: d, bal: bal, ccy: ccy,
                    fx: hasNum(rate) ? num(rate) : 1, usd: Math.abs(usd),
                    rate: hasNum(col(r, "Rate")) ? num(col(r, "Rate")) : null,
                    note: String(col(r, "Notes") || "") };
        if (prev) liabilities.splice(liabilities.indexOf(prev), 1);
        seen[id] = row;
        liabilities.push(row);
      });
      /* a liability whose statement already nets it off is not deducted twice */
      liabilities.forEach(function (l) {
        l.netted = /already net|net of|included in the account value/i.test(l.note);
      });
    } else {
      want("No \"Liabilities\" sheet in Main DB. The FIBI *4390 loan and the Schwab *0687 margin loan are therefore not in any figure on this page. " +
           "Add a sheet named Liabilities with the columns AccountID, Date, Balance, Currency, FXRateToUSD, Rate, Notes.");
    }
    function liabilityFor(id) {
      for (var i = 0; i < liabilities.length; i++) if (liabilities[i].id === id) return liabilities[i];
      return null;
    }
    /* what is deducted from capital: the liabilities the statements do not
       already net off */
    var loanTotal = liabilities.reduce(function (s, l) { return s + (l.netted ? 0 : l.usd); }, 0);

    /* ------- private funds, grouped by Entity / Fund --------------------- */
    var ledger = db.tabs["Investment Ledger"].rows;
    var hasCommitment = hasCol(ledger, "Commitment");
    if (!hasCommitment) want("No \"Commitment\" column on the Investment Ledger sheet, so unfunded commitments cannot be shown.");
    var funds = {}, fundOrder = [];
    ledger.forEach(function (r) {
      var type = String(col(r, "Asset Type") || "");
      if (type.indexOf("Private fund (via L&A)") !== 0) return;      // excludes Doss options
      /* the fund is the Entity / Fund column; the Deal Name is the deal
         inside it, shown as a qualifier so both names the papers use appear */
      var entity = String(col(r, "Entity / Fund") || "").trim();
      var deal = String(col(r, "Deal Name") || "").trim();
      var key = entity || deal;
      if (!key) return;
      if (!funds[key]) {
        funds[key] = { name: key, deals: [], cost: 0, invested: 0, roc: 0, income: 0,
                       commitment: null, type: type.replace(/^Private fund \(via L&A\)\s*-\s*/, "") };
        fundOrder.push(key);
      }
      var f = funds[key];
      if (deal && f.deals.indexOf(deal) < 0) f.deals.push(deal);
      f.cost += num(col(r, "Current Value"));
      f.invested += num(col(r, "Amount Invested"));
      if (hasCommitment && hasNum(col(r, "Commitment"))) f.commitment = (f.commitment || 0) + num(col(r, "Commitment"));
    });

    var laCash = null, laCashNote = "", dists = [];
    db.tabs["Distributions"].rows.forEach(function (r) {
      var label = String(col(r, "Date") || "");
      if (/l&a cash remaining/i.test(label)) {
        laCash = num(col(r, "Amit Amount"));
        laCashNote = String(col(r, "Source / Notes") || "");
        return;
      }
      var d = toDate(label);
      if (!d) return;                                                // only dated rows are transactions
      dists.push({ date: d, fund: String(col(r, "Fund") || ""), treat: String(col(r, "Treatment") || ""),
                   type: String(col(r, "Type") || ""), amt: num(col(r, "Amit Amount")) });
    });
    if (laCash === null) { laCash = 0; want("No \"L&A cash remaining\" row on the Distributions sheet, so L&A cash is shown as zero."); }

    function matchFund(distFund) {
      var f = distFund.toLowerCase();
      var i, n;
      for (i = 0; i < fundOrder.length; i++) {
        n = fundOrder[i].toLowerCase();
        if (f.indexOf(n) >= 0 || n.indexOf(f) >= 0) return fundOrder[i];
      }
      /* the ledger and the distribution notice name the same fund
         differently, so fall back to the longest shared word */
      var best = null, bestLen = 0;
      for (i = 0; i < fundOrder.length; i++) {
        var words = (fundOrder[i] + " " + funds[fundOrder[i]].deals.join(" ")).toLowerCase()
          .split(/[^a-z0-9]+/).filter(function (w) { return w.length > 4; });
        words.forEach(function (w) {
          if (f.indexOf(w) >= 0 && w.length > bestLen) { bestLen = w.length; best = fundOrder[i]; }
        });
      }
      return best;
    }
    dists.forEach(function (d) {
      var f = matchFund(d.fund);
      if (!f) { if (d.amt) want("Distribution " + iso(d.date) + " " + d.fund + " does not match any fund on the Investment Ledger."); return; }
      if (/return of capital/i.test(d.treat)) funds[f].roc += d.amt;
      else if (/income/i.test(d.treat)) funds[f].income += d.amt;
    });

    var la = fundOrder.map(function (n) {
      var f = funds[n];
      f.value = f.cost - f.roc;
      f.dpi = f.invested ? (f.roc + f.income) / f.invested : null;
      f.unfunded = f.commitment === null ? null : Math.max(0, f.commitment - f.invested);
      return f;
    });
    var laFundTotal = la.reduce(function (s, f) { return s + f.value; }, 0);
    var laTotal = laFundTotal + laCash;

    /* ------- real estate -------------------------------------------------- */
    /* The Vitkin sheet carries a title row above the header, so the header is
       found by looking for the row that holds a "Date" cell. */
    var vrows = db.tabs["20 Vitkin Street - APT #2"].rows;
    var vitHistory = [], vit = 0, vitAt = null, vitIls = 0, vitFx = null;
    (function () {
      var hdr = null;
      vrows.forEach(function (r) {
        var vals = Object.keys(r).map(function (k) { return String(r[k]).trim(); });
        if (!hdr && vals.indexOf("Date") >= 0) hdr = vals;
      });
      function pick(row, hdrName, colName) {
        if (hdr) {
          var i = hdr.indexOf(hdrName);
          if (i >= 0) { var vals = Object.keys(row).map(function (k) { return row[k]; }); return vals[i]; }
        }
        return col(row, colName);
      }
      vrows.forEach(function (r) {
        var d = toDate(pick(r, "Date", "Date"));
        if (!d) return;
        var usd = num(pick(r, "Value(USD)", "Value(USD)"));
        var ils = num(pick(r, "Value(ILS)", "Value(ILS)"));
        var rate = num(pick(r, "USD to ILS", "USD to ILS"));
        if (!usd && !ils) return;
        vitHistory.push({ date: d, at: iso(d), usd: usd, ils: ils, fx: rate });
      });
      vitHistory.sort(function (a, b) { return a.date - b.date; });
      if (vitHistory.length) {
        var last = vitHistory[vitHistory.length - 1];
        vit = last.usd; vitIls = last.ils; vitAt = last.at; vitFx = last.fx;
      } else {
        want("No dated valuation rows on the \"20 Vitkin Street - APT #2\" sheet, so the apartment is not in these figures.");
      }
    })();

    var props = [], soldProps = [];
    db.tabs["Glaser Real Estate"].rows.forEach(function (r) {
      var name = String(col(r, "PropertyName") || "").trim();
      if (!name) return;
      var status = String(col(r, "Status") || "").trim().toLowerCase();
      var row = { name: name, value: num(col(r, "OwnerShareValue")),
                  owner: String(col(r, "Owner") || "").trim(), ccy: "USD", status: status };
      if (status === "owned") props.push(row); else soldProps.push(row);
    });
    var reTotal = vit + props.reduce(function (s, p) { return s + p.value; }, 0);

    /* ------- jewelry, shown separately and never in capital --------------- */
    var jewel = [];
    db.tabs["Jewelry"].rows.forEach(function (r) {
      var item = String(col(r, "Item") || "").trim();
      if (!item || /^total/i.test(item)) return;
      jewel.push({ item: item, value: num(col(r, "Value")), owner: col(r, "Owner") || "" });
    });
    var jewelTotal = jewel.reduce(function (s, j) { return s + j.value; }, 0);

    /* ------- holdings, only if the sheet exists --------------------------- */
    var holdings = [];
    if (db.tabs["Holdings"]) {
      db.tabs["Holdings"].rows.forEach(function (r) {
        var sym = String(col(r, "Symbol") || col(r, "Holding") || "").trim();
        if (!sym) return;
        holdings.push({ symbol: sym, account: String(col(r, "AccountID") || "").trim(),
                        value: num(col(r, "ValueUSD") || col(r, "Value")) });
      });
    }

    /* ------- benchmark series, only if the sheet exists ------------------- */
    var benchSheet = null;
    if (db.tabs["Benchmarks"]) {
      benchSheet = {};
      db.tabs["Benchmarks"].rows.forEach(function (r) {
        var d = toDate(col(r, "Month"));
        var b = String(col(r, "Benchmark") || "").trim();
        var v = col(r, "TotalReturnIndex");
        if (!d || !b || !hasNum(v)) return;
        benchSheet[b] = benchSheet[b] || [];
        benchSheet[b].push({ at: iso(monthEnd(d)), date: monthEnd(d), level: num(v) });
      });
      Object.keys(benchSheet).forEach(function (b) {
        benchSheet[b].sort(function (a, c) { return a.date - c.date; });
      });
    }

    return {
      accounts: accounts, byAcct: byAcct, valueAt: valueAt, started: started, flowsIn: flowsIn,
      la: la, laCash: laCash, laCashNote: laCashNote, laFundTotal: laFundTotal, laTotal: laTotal,
      vit: vit, vitIls: vitIls, vitAt: vitAt, vitFx: vitFx, vitHistory: vitHistory,
      props: props, soldProps: soldProps, reTotal: reTotal,
      jewel: jewel, jewelTotal: jewelTotal, holdings: holdings,
      checks: checks, dists: dists, benchSheet: benchSheet,
      liabilities: liabilities, liabilitiesSheet: liabilitiesSheet, liabilityFor: liabilityFor,
      loanTotal: loanTotal, hasCommitment: hasCommitment,
      fx: fx, ilsPerUsdAt: ilsPerUsdAt, latest: latest
    };
  }

  /* ------------------------------------------------- scope and totals ---- */
  function scopeAccounts(M) {
    if (state.scope === "starwell") return CFG.starwell.filter(function (a) { return M.accounts[a]; });
    return Object.keys(M.accounts).filter(function (a) { return (M.accounts[a].dates || []).length; });
  }
  function totals(M, asOf) {
    var ids = scopeAccounts(M), rows = [], sum = 0;
    ids.forEach(function (id) {
      var v = M.valueAt(id, asOf);
      sum += v.usd;
      rows.push({ id: id, value: v.usd, at: v.at, stale: v.at && v.at < iso(asOf) });
    });
    /* only liabilities that belong to an account in scope */
    var loan = M.liabilities.reduce(function (s, l) {
      return s + (l.netted || ids.indexOf(l.id) < 0 ? 0 : l.usd);
    }, 0);
    var capital = sum - loan + M.laTotal;
    return { rows: rows, accounts: sum, loan: -loan, la: M.laTotal, capital: capital,
             re: M.reTotal, aum: capital + M.reTotal };
  }

  /* --------------------------------------------- monthly change engine --- */
  /* Modified Dietz. Each flow is dated flowLagDays before its statement date
     and weighted by the share of the period it was invested for. An account
     whose first statement falls inside the period opens at zero; that
     statement's Additions already carry the opening transfer, so it is a
     flow, not a gain. */
  function periodChange(M, ids, from, to) {
    var span = days(from, to) || 1, gain = 0, flow = 0, wflow = 0, add = 0, wd = 0;
    ids.forEach(function (id) {
      var v1 = M.valueAt(id, to).usd;
      var v0 = M.started(id, from) ? M.valueAt(id, from).usd : 0;
      var f = 0;
      M.flowsIn(id, from, to).forEach(function (fl) {
        f += fl.net; add += fl.add; wd += fl.wd;
        var fd = new Date(fl.date.getTime() - FLOW_LAG * 86400000);
        wflow += fl.net * (Math.max(0, Math.min(span, days(fd, to))) / span);
      });
      gain += (v1 - v0) - f;
      flow += f;
    });
    var base = ids.reduce(function (s, id) { return s + (M.started(id, from) ? M.valueAt(id, from).usd : 0); }, 0);
    var endv = ids.reduce(function (s, id) { return s + M.valueAt(id, to).usd; }, 0);
    return { start: base, end: endv, gain: gain, flow: flow, add: add, wd: wd,
             ret: (base + wflow) ? gain / (base + wflow) : null };
  }

  /* A month-end only counts when every account still reporting at that point
     has a statement on it. A month that is missing one merges into the next
     complete month and says so; nothing is ever interpolated. */
  function monthSeries(M, ids, from, to) {
    var have = {}, lastOf = {};
    ids.forEach(function (id) {
      (M.accounts[id].dates || []).forEach(function (k) { have[id + "|" + k] = 1; });
      var ds = M.accounts[id].dates || [];
      lastOf[id] = ds.length ? ds[ds.length - 1] : null;
    });
    var bounds = [];
    var ptr = monthEnd(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)));
    while (ptr <= to) {
      var k = iso(ptr), ok = true;
      ids.forEach(function (id) {
        if (!M.started(id, ptr)) return;                     // not open yet
        if (lastOf[id] && lastOf[id] < k) return;            // stopped reporting, carried forward
        if (!have[id + "|" + k]) ok = false;
      });
      if (ok) bounds.push(new Date(ptr.getTime()));
      ptr = monthEnd(new Date(Date.UTC(ptr.getUTCFullYear(), ptr.getUTCMonth() + 1, 1)));
    }
    if (!bounds.length || iso(bounds[0]) !== iso(from)) bounds.unshift(new Date(from.getTime()));
    var out = [], cum = 0;
    for (var i = 1; i < bounds.length; i++) {
      var a = bounds[i - 1], b = bounds[i];
      var r = periodChange(M, ids, a, b);
      var gapMonths = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
      var merged = gapMonths > 1;
      var first = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1));
      /* a merged period reads "Feb-Mar 26", not "Feb 26 to Mar 26" */
      r.label = merged
        ? (MON[first.getUTCMonth()] + "-" + MON[b.getUTCMonth()] + " " + String(b.getUTCFullYear()).slice(2))
        : mLabel(b);
      r.long = merged ? (mLong(first) + " to " + mLong(b)) : mLong(b);
      r.merged = merged; r.from = a; r.to = b;
      cum += r.gain; r.cum = cum;
      out.push(r);
    }
    return out;
  }

  /* Time-weighted: chain the Modified Dietz returns of the periods above.
     This is what a benchmark may be compared with. A money-weighted return
     (XIRR) never is. */
  function timeWeighted(series) {
    var g = 1, n = 0;
    series.forEach(function (s) { if (s.ret !== null && isFinite(s.ret)) { g *= (1 + s.ret); n++; } });
    return n ? g - 1 : null;
  }
  function annualise(totalReturn, fromDate, toDate_) {
    if (totalReturn === null) return null;
    var yrs = days(fromDate, toDate_) / DAY_COUNT;
    if (yrs <= 0) return null;
    if (yrs <= 1) return totalReturn;
    return Math.pow(1 + totalReturn, 1 / yrs) - 1;
  }

  /* ------------------------------------------------------------- XIRR ---- */
  function xnpv(rate, cf) {
    var t0 = cf[0].d;
    return cf.reduce(function (s, c) { return s + c.a / Math.pow(1 + rate, days(t0, c.d) / DAY_COUNT); }, 0);
  }
  function xirr(cf) {
    if (cf.length < 2) return null;
    var lo = -0.95, hi = 10, mid, i;
    if (xnpv(lo, cf) * xnpv(hi, cf) > 0) return null;
    for (i = 0; i < 200; i++) { mid = (lo + hi) / 2; if (xnpv(mid, cf) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* The money-weighted return the quarterly deck reports.
     Start value at 31 December of the start year is an outflow; each calendar
     year's net flows are summed and placed on 30 June of that year; the end
     value at 31 December of the end year is an inflow; the day count is
     365.25. Run over one account, or over a pool with the flows aggregated. */
  function deckIRR(M, ids, startYear, endYear) {
    var start = new Date(Date.UTC(startYear, 11, 31));
    var end = new Date(Date.UTC(endYear, 11, 31));
    var sv = ids.reduce(function (s, id) { return s + M.valueAt(id, start).usd; }, 0);
    if (!sv) return null;
    var cf = [{ d: start, a: -sv }];
    for (var y = startYear + 1; y <= endYear; y++) {
      var net = 0;
      ids.forEach(function (id) {
        (M.accounts[id].dates || []).forEach(function (k) {
          var s = M.byAcct[id][k];
          if (s.date.getUTCFullYear() === y) net += s.add - s.wd;
        });
      });
      if (net) cf.push({ d: new Date(Date.UTC(y, IRR_FLOW_MONTH - 1, 30)), a: -net });
    }
    cf.push({ d: end, a: ids.reduce(function (s, id) { return s + M.valueAt(id, end).usd; }, 0) });
    cf.sort(function (a, b) { return a.d - b.d; });
    return xirr(cf);
  }

  /* ------------------------------------------------------- allocation ---- */
  /* By asset, not by account. An account's class comes from the settings map,
     so FIBI *852, which is Starwell's cash, is not counted as listed
     securities. Shares use largest remainder so the column foots to 100.0%. */
  function allocation(M, ids, asOf) {
    function sumClass(cls) {
      return ids.reduce(function (s, id) {
        return s + ((M.accounts[id] || {}).assetClass === cls ? M.valueAt(id, asOf).usd : 0);
      }, 0);
    }
    function sumWhere(test) {
      return ids.reduce(function (s, id) { return s + (test(M.accounts[id] || {}) ? M.valueAt(id, asOf).usd : 0); }, 0);
    }
    var usdListed = sumWhere(function (a) { return a.assetClass === "listed" && a.ccy !== "ILS"; });
    var ilsListedIds = ids.filter(function (id) {
      var a = M.accounts[id] || {}; return a.assetClass === "listed" && a.ccy === "ILS";
    });
    var cashTotal = sumClass("cash") + M.laCash;

    var lines = [
      { label: "Listed securities, US", value: usdListed,
        src: "Statements: " + ids.filter(function (id) {
          var a = M.accounts[id] || {}; return a.assetClass === "listed" && a.ccy !== "ILS";
        }).join(", ") + ", " + iso(asOf) }
    ];
    ilsListedIds.forEach(function (id) {
      var l = M.liabilityFor(id);
      var gross = M.valueAt(id, asOf).usd;
      var net = gross - (l && !l.netted ? l.usd : 0);
      lines.push({
        label: (M.accounts[id].label || id) + (l && !l.netted ? ", net of loan" : ""),
        value: net,
        src: "Statements: " + id + ", " + iso(asOf) + (l && !l.netted ? "; Liabilities: " + id + ", " + l.at : "")
      });
    });
    lines.push({ label: "Cash", value: cashTotal,
      src: "Statements: " + ids.filter(function (id) { return (M.accounts[id] || {}).assetClass === "cash"; }).join(", ") +
           ", " + iso(asOf) + "; Distributions: L&A cash remaining" });
    lines.push({ label: "Private funds", value: M.laFundTotal,
      src: "Investment Ledger: private funds; Distributions: return of capital" });
    lines.push({ label: "Real estate", value: M.reTotal,
      src: "20 Vitkin Street - APT #2: " + (M.vitAt || "n/a") + "; Glaser Real Estate: status owned" });

    var total = lines.reduce(function (s, l) { return s + l.value; }, 0);
    var sh = shares(lines.map(function (l) { return l.value; }), total, 1);
    lines.forEach(function (l, i) { l.share = sh[i]; });

    /* By currency, by asset and not by account: the shekel assets are the
       ILS accounts, net of their loans, plus the Tel Aviv apartment. */
    var ilsTotal = ilsListedIds.reduce(function (s, id) {
      var l = M.liabilityFor(id);
      return s + M.valueAt(id, asOf).usd - (l && !l.netted ? l.usd : 0);
    }, 0)
      + ids.reduce(function (s, id) {
          var a = M.accounts[id] || {};
          return s + (a.assetClass === "cash" && a.ccy === "ILS" ? M.valueAt(id, asOf).usd : 0);
        }, 0)
      + M.vit;
    var ccy = [
      { label: "USD", value: total - ilsTotal, src: "Accounts: Currency USD" },
      { label: "ILS", value: ilsTotal, src: "Accounts: Currency ILS; 20 Vitkin Street - APT #2" }
    ];
    var csh = shares(ccy.map(function (c) { return c.value; }), total, 1);
    ccy.forEach(function (c, i) { c.share = csh[i]; });

    return { lines: lines, ccy: ccy, total: total };
  }

  /* ------------------------------------------------- statement coverage -- */
  function coverage(M, ids, fromIso) {
    var from = toDate(fromIso), to = toDate(M.latest);
    var months = [], ptr = monthEnd(from);
    while (ptr <= to) { months.push(iso(ptr)); ptr = addMonthEnd(ptr, 1); }
    var rows = ids.map(function (id) {
      var ds = M.accounts[id].dates || [];
      var last = ds.length ? ds[ds.length - 1] : null;
      var first = ds.length ? ds[0] : null;
      return {
        id: id, label: M.accounts[id].label || id, last: last,
        behind: last ? days(toDate(last), to) : null,
        cells: months.map(function (m) {
          if (first && m < first) return "pre";          // not open yet
          if (last && m > last) return "post";           // stopped reporting
          return ds.indexOf(m) >= 0 ? "yes" : "no";
        })
      };
    });
    return { months: months, rows: rows, staleDays: thr("staleDays") };
  }

  /* ------------------------------------------------------------ alerts --- */
  function alerts(M, ids, asOf) {
    var out = [], staleDays = thr("staleDays"), marginLimit = thr("marginLimit"),
        conc = thr("concentrationLimit");
    ids.forEach(function (id) {
      var v = M.valueAt(id, asOf);
      if (!v.at) return;
      var behind = days(toDate(v.at), asOf);
      if (behind > staleDays) {
        out.push({ kind: "Stale statement",
          text: (M.accounts[id].label || id) + " last reported " + v.at + ", " + behind + " days behind",
          src: "Statements: " + id + ", " + v.at });
      }
    });
    M.liabilities.forEach(function (l) {
      if (ids.indexOf(l.id) < 0) return;
      var v = M.valueAt(l.id, asOf).usd;
      /* a margin loan the statement already nets off is measured against the
         gross value, which is the statement value plus the loan */
      var base = l.netted ? v + l.usd : v;
      if (base && l.usd / base > marginLimit) {
        out.push({ kind: "Borrowing", text: (M.accounts[l.id].label || l.id) + " loan is " +
          pct(l.usd / base, 1) + " of the account, above the " + pct(marginLimit, 0) + " limit",
          src: "Liabilities: " + l.id + ", " + l.at });
      }
    });
    if (M.holdings.length) {
      var listed = ids.reduce(function (s, id) {
        return s + ((M.accounts[id] || {}).assetClass === "listed" ? M.valueAt(id, asOf).usd : 0);
      }, 0);
      var bySym = {};
      M.holdings.forEach(function (h) {
        if (h.account && ids.indexOf(h.account) < 0) return;
        bySym[h.symbol] = (bySym[h.symbol] || 0) + h.value;
      });
      Object.keys(bySym).forEach(function (s) {
        if (listed && bySym[s] / listed > conc) {
          out.push({ kind: "Concentration", text: s + " is " + pct(bySym[s] / listed, 1) +
            " of listed holdings, above the " + pct(conc, 0) + " limit", src: "Holdings: " + s });
        }
      });
    }
    var open = M.checks.dupes.length + M.checks.missing.length;
    if (open) out.push({ kind: "Data checks", text: open + " open " + (open === 1 ? "item" : "items") + " below", src: "Main DB" });
    return out;
  }

  return {
    CFG: CFG, state: state,
    readMainDB: readMainDB, loadFrom: loadFrom, build: build, totals: totals,
    scopeAccounts: scopeAccounts,
    periodChange: periodChange, monthSeries: monthSeries, timeWeighted: timeWeighted,
    annualise: annualise, deckIRR: deckIRR, xirr: xirr, xnpv: xnpv,
    allocation: allocation, coverage: coverage, alerts: alerts, shares: shares,
    fmt: { big: big, bigSigned: bigSigned, axis: axis, k1: k1, full: full, pct: pct,
           pctSigned: pctSigned, pts: pts, esc: esc, iso: iso, mLabel: mLabel, mLong: mLong,
           MINUS: MINUS, signed: signed, num: num, toDate: toDate },
    util: { el: el, monthEnd: monthEnd, prevMonthEnd: prevMonthEnd, addMonthEnd: addMonthEnd,
            days: days, conv: conv, thr: thr },
    _clearCache: function () { cache = null; }
  };
})();
