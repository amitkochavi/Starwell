/* Starwell Portal — the Dashboard view of Starwell HQ.

   Reads Main DB (published Google Sheet) once per session, keeps it in memory,
   and renders the quarterly review figures from it. Nothing is ever written
   back to Main DB.

   SECURITY, to be fixed the week of 9 Nov 2026: the workbook is read straight
   from the browser, so its published URL has to sit in this file, and this
   repository is public. Anyone who finds the URL can read the whole balance
   sheet without signing in. The replacement is a server-side function holding
   the URL in an environment variable and checking the caller's Supabase
   session; when that lands, MAIN_DB.pubUrl goes away and fetchTab() calls the
   function instead. Until then, treat the URL as a published secret. */

window.StarwellPortal = (function () {
  "use strict";

  var MAIN_DB = {
    pubUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBX6lzMmMK7jnnNaW1ZF3VGG0yR9v7k8P3nx1uAQ9gI3a7_pvluZchUMIkhyM9woPiuauCSP2Akmf5"
  };

  /* The FIBI *4390 loan is not in Main DB yet. Add a "Liabilities" sheet
     (AccountID, Date, Balance, Currency, FXRateToUSD, Notes) and this constant
     stops being used. */
  var FIBI_LOAN = { ils: 37632.19, fx: 3.10, label: "ILS 37,632.19 at 3.10, config value" };

  var STARWELL = ["SCHWAB_0687", "CNB_48101310", "FIBI_314390", "FIBI_852",
                  "SCHWAB_1558", "CNB_48492010", "CNB_48784990"];

  var cache = null;      // one read per session
  var state = { scope: "starwell", period: "ytd", ccy: "USD", fx: 3.16, group: "pool", pick: null };

  /* ---------------------------------------------------------------- utils */
  function num(v) {
    if (v === null || v === undefined) return 0;
    var s = String(v).replace(/[^0-9.\-]/g, "");
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
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
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function mLabel(d) { return MON[d.getUTCMonth()] + " " + String(d.getUTCFullYear()).slice(2); }
  function mLong(d) { return MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }

  var MINUS = "−";
  function sign(n) { return n < 0 ? MINUS : ""; }
  function conv(n) { return state.ccy === "ILS" ? n * state.fx : n; }
  function cur() { return state.ccy === "ILS" ? "₪" : "$"; }
  function big(n) {              /* $12.97M for the headline figures */
    var v = conv(n), a = Math.abs(v);
    if (a >= 1e6) return sign(v) + cur() + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return sign(v) + cur() + Math.round(a / 1e3) + "K";
    return sign(v) + cur() + a.toFixed(0);
  }
  function k1(n) {               /* tables run in thousands, one decimal */
    var v = conv(n);
    return sign(v) + cur() + Math.abs(v / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function full(n) {             /* data checks quote the amount in full */
    return sign(n) + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n, dp) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    return sign(n) + Math.abs(n * 100).toFixed(dp === undefined ? 2 : dp) + "%";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(id) { return document.getElementById(id); }

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

  function readMainDB() {
    if (cache) return Promise.resolve(cache);
    var base = MAIN_DB.pubUrl.replace(/\/$/, "");
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
      var need = ["Accounts", "Statements", "Investment Ledger", "Distributions",
                  "20 Vitkin Street - APT #2", "Glaser Real Estate", "Jewelry"];
      var missing = need.filter(function (n) { return !gidFor(n); });
      if (missing.length) throw new Error("sheets not found in Main DB: " + missing.join(", "));
      return Promise.all(need.map(function (n) {
        return fetchText(base + "/pub?gid=" + gidFor(n) + "&single=true&output=csv")
          .then(function (t) { return { name: n, rows: parseCSV(t), raw: t }; });
      }));
    }).then(function (tabs) {
      var by = {}; tabs.forEach(function (t) { by[t.name] = t; });
      cache = { tabs: by, readAt: new Date(), log: tabs.map(function (t) { return t.name + ": " + t.rows.length + " rows"; }) };
      return cache;
    });
  }

  /* --------------------------------------------------------- model ------- */
  function build(db) {
    var checks = { dupes: [], stale: [], gaps: [], notes: [] };

    var accounts = {};
    db.tabs["Accounts"].rows.forEach(function (r) {
      var id = String(col(r, "AccountID") || "").trim();
      if (!id) return;
      accounts[id] = {
        id: id, inst: col(r, "Institution") || "", name: col(r, "AccountName") || "",
        mask: col(r, "AccountNumberMasked") || "", owner: String(col(r, "Owner") || "").trim(),
        ccy: col(r, "Currency") || "USD"
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
        add: num(col(r, "Additions")),
        wd: num(col(r, "Withdrawals")),
        note: String(col(r, "Notes") || "")
      };
      var nt = byAcct[id][key].note;
      if (/\bopen\b|confirm/i.test(nt)) checks.notes.push(id + " " + key + ": " + nt.slice(0, 150));
    });
    Object.keys(byAcct).forEach(function (id) {
      accounts[id] = accounts[id] || { id: id, owner: "", inst: "", name: id, mask: "" };
      accounts[id].dates = Object.keys(byAcct[id]).sort();
    });

    function valueAt(id, on) {
      var ds = (accounts[id] && accounts[id].dates) || [], k = null, t = iso(on), i;
      for (i = 0; i < ds.length; i++) if (ds[i] <= t) k = ds[i];
      return k ? { usd: byAcct[id][k].usd, at: k } : { usd: 0, at: null };
    }
    function started(id, on) { var v = valueAt(id, on); return v.at !== null; }
    function flowsIn(id, from, to) {
      var out = [], ds = (accounts[id] && accounts[id].dates) || [];
      ds.forEach(function (k) {
        var s = byAcct[id][k];
        if (s.date > from && s.date <= to) {
          var net = s.add - s.wd;
          if (net) out.push({ date: s.date, net: net, add: s.add, wd: s.wd });
        }
      });
      return out;
    }

    /* ------- private funds, carried at Current Value less return of capital */
    var funds = {}, fundOrder = [];
    db.tabs["Investment Ledger"].rows.forEach(function (r) {
      var type = String(col(r, "Asset Type") || "");
      if (type.indexOf("Private fund (via L&A)") !== 0) return;      // excludes Doss options
      var name = String(col(r, "Deal Name") || "").trim();
      if (!funds[name]) { funds[name] = { name: name, cost: 0, roc: 0 }; fundOrder.push(name); }
      funds[name].cost += num(col(r, "Current Value"));
    });
    var laCash = 0, dists = [];
    db.tabs["Distributions"].rows.forEach(function (r) {
      var label = String(col(r, "Date") || "");
      if (/l&a cash remaining/i.test(label)) { laCash = num(col(r, "Amit Amount")); return; }
      var d = toDate(label);
      if (!d) return;                                                // only dated rows are transactions
      dists.push({ date: d, fund: String(col(r, "Fund") || ""), treat: String(col(r, "Treatment") || ""), amt: num(col(r, "Amit Amount")) });
    });
    function matchFund(distFund) {
      var f = distFund.toLowerCase();
      for (var i = 0; i < fundOrder.length; i++) {
        var n = fundOrder[i].toLowerCase();
        var words = n.split(/\s+/).filter(function (w) { return w.length > 4; });
        if (f.indexOf(n) >= 0 || words.some(function (w) { return f.indexOf(w) >= 0; })) return fundOrder[i];
      }
      /* the ledger and the distribution notice name the same fund differently */
      if (/terminal/.test(f)) return fundOrder.filter(function (n) { return /industrial|terminal/i.test(n); })[0];
      if (/dawson|somerset/.test(f)) return fundOrder.filter(function (n) { return /dawson/i.test(n); })[0];
      return null;
    }
    dists.forEach(function (d) {
      if (!/return of capital/i.test(d.treat)) return;
      var f = matchFund(d.fund);
      if (f) funds[f].roc += d.amt;
    });
    var la = fundOrder.map(function (n) { return { name: n, value: funds[n].cost - funds[n].roc }; });
    la.push({ name: "L&A cash", value: laCash });
    var laTotal = la.reduce(function (s, f) { return s + f.value; }, 0);

    /* ------- real estate */
    var vrows = db.tabs["20 Vitkin Street - APT #2"].rows, vit = 0, vitAt = null;
    var hdr = null;
    vrows.forEach(function (r) {
      var vals = Object.keys(r).map(function (k) { return String(r[k]).trim(); });
      if (!hdr && vals.indexOf("Date") >= 0) hdr = vals;             // header sits on row 2
    });
    if (hdr) {
      var di = hdr.indexOf("Date"), ui = hdr.indexOf("Value(USD)");
      vrows.forEach(function (r) {
        var vals = Object.keys(r).map(function (k) { return r[k]; });
        var d = toDate(vals[di]);
        if (d && (!vitAt || d > vitAt)) { vitAt = d; vit = num(vals[ui]); }
      });
    }
    if (!vit) {
      vrows.forEach(function (r) {
        var d = toDate(col(r, "Date")), u = num(col(r, "Value(USD)"));
        if (d && u && (!vitAt || d > vitAt)) { vitAt = d; vit = u; }
      });
    }
    var props = [];
    db.tabs["Glaser Real Estate"].rows.forEach(function (r) {
      if (String(col(r, "Status") || "").trim().toLowerCase() !== "owned") return;
      props.push({ name: String(col(r, "PropertyName") || ""), value: num(col(r, "OwnerShareValue")) });
    });
    var reTotal = vit + props.reduce(function (s, p) { return s + p.value; }, 0);

    /* ------- jewelry, shown separately and never in AUM */
    var jewel = [];
    db.tabs["Jewelry"].rows.forEach(function (r) {
      var item = String(col(r, "Item") || "").trim();
      if (!item || /^total/i.test(item)) return;
      jewel.push({ item: item, value: num(col(r, "Value")), owner: col(r, "Owner") || "" });
    });
    var jewelTotal = jewel.reduce(function (s, j) { return s + j.value; }, 0);

    return {
      accounts: accounts, byAcct: byAcct, valueAt: valueAt, started: started, flowsIn: flowsIn,
      la: la, laTotal: laTotal, vit: vit, vitAt: vitAt, props: props, reTotal: reTotal,
      jewel: jewel, jewelTotal: jewelTotal, checks: checks, dists: dists,
      loan: -(FIBI_LOAN.ils / FIBI_LOAN.fx), loanLabel: FIBI_LOAN.label,
      latest: (function () {
        var t = null;
        Object.keys(byAcct).forEach(function (id) {
          Object.keys(byAcct[id]).forEach(function (k) { if (!t || k > t) t = k; });
        });
        return t;
      })()
    };
  }

  /* ------------------------------------------------- scope and totals ---- */
  function scopeAccounts(M) {
    if (state.scope === "starwell") return STARWELL.filter(function (a) { return M.accounts[a]; });
    return Object.keys(M.accounts).filter(function (a) { return (M.accounts[a].dates || []).length; });
  }
  function totals(M, asOf) {
    var ids = scopeAccounts(M), rows = [], sum = 0;
    ids.forEach(function (id) {
      var v = M.valueAt(id, asOf);
      sum += v.usd;
      rows.push({ id: id, value: v.usd, at: v.at, stale: v.at && v.at < iso(asOf) });
    });
    var loan = state.scope === "starwell" ? M.loan : M.loan;
    var capital = sum + loan + M.laTotal;
    return { rows: rows, accounts: sum, loan: loan, la: M.laTotal, capital: capital,
             re: M.reTotal, aum: capital + M.reTotal };
  }

  /* --------------------------------------------- monthly change engine --- */
  /* Modified Dietz. Each flow is dated 15 days before its statement date and
     weighted by the share of the period it was invested for. An account whose
     first statement falls inside the period opens at zero; that statement's
     Additions already carry the opening transfer, so it is a flow, not a gain. */
  function periodChange(M, ids, from, to) {
    var span = days(from, to) || 1, gain = 0, flow = 0, wflow = 0, add = 0, wd = 0;
    ids.forEach(function (id) {
      var v1 = M.valueAt(id, to).usd;
      var v0 = M.started(id, from) ? M.valueAt(id, from).usd : 0;
      var f = 0;
      M.flowsIn(id, from, to).forEach(function (fl) {
        f += fl.net; add += fl.add; wd += fl.wd;
        var fd = new Date(fl.date.getTime() - 15 * 86400000);
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
    var bounds = [], d = monthEnd(from);
    if (iso(d) !== iso(from)) d = from;
    var cursor = new Date(from.getTime());
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
    var out = [];
    for (var i = 1; i < bounds.length; i++) {
      var a = bounds[i - 1], b = bounds[i];
      var r = periodChange(M, ids, a, b);
      var merged = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) > 1;
      r.label = merged ? (mLabel(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1))) + " to " + mLabel(b)) : mLabel(b);
      r.long = merged ? (mLong(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1))) + " to " + mLong(b)) : mLong(b);
      r.merged = merged; r.from = a; r.to = b;
      out.push(r);
    }
    return out;
  }

  /* ------------------------------------------------------------- XIRR ---- */
  function xnpv(rate, cf) {
    var t0 = cf[0].d;
    return cf.reduce(function (s, c) { return s + c.a / Math.pow(1 + rate, days(t0, c.d) / 365); }, 0);
  }
  function xirr(cf) {
    if (cf.length < 2) return null;
    var lo = -0.95, hi = 10, mid, i;
    if (xnpv(lo, cf) * xnpv(hi, cf) > 0) return null;
    for (i = 0; i < 200; i++) { mid = (lo + hi) / 2; if (xnpv(mid, cf) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function acctIRR(M, ids, from, to) {
    var start = ids.reduce(function (s, id) { return s + (M.started(id, from) ? M.valueAt(id, from).usd : 0); }, 0);
    if (!start) return null;
    var cf = [{ d: from, a: -start }];
    ids.forEach(function (id) {
      M.flowsIn(id, from, to).forEach(function (fl) { cf.push({ d: fl.date, a: -fl.net }); });
    });
    cf.push({ d: to, a: ids.reduce(function (s, id) { return s + M.valueAt(id, to).usd; }, 0) });
    cf.sort(function (a, b) { return a.d - b.d; });
    return xirr(cf);
  }

  return {
    MAIN_DB: MAIN_DB, STARWELL: STARWELL, state: state,
    readMainDB: readMainDB, build: build, totals: totals,
    periodChange: periodChange, monthSeries: monthSeries, acctIRR: acctIRR,
    fmt: { big: big, k1: k1, full: full, pct: pct, esc: esc, iso: iso, mLabel: mLabel, mLong: mLong, MINUS: MINUS, num: num, toDate: toDate },
    util: { el: el, monthEnd: monthEnd, prevMonthEnd: prevMonthEnd, days: days },
    _clearCache: function () { cache = null; }
  };
})();
