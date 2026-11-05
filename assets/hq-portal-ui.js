/* Starwell Portal — rendering. Reads nothing itself: it takes the model from
   hq-dashboard.js and draws the deck in black and white.
   Page order follows the quarterly review: headline figures, monthly change,
   capital, accounts, allocation, data checks. */

(function () {
  "use strict";
  var P = window.StarwellPortal;
  if (!P) return;

  var F = P.fmt, U = P.util, S = P.state;
  var MODEL = null, DB = null, CHART = null, ASOF = null;

  var US_ACCTS = ["SCHWAB_0687", "SCHWAB_1558", "CNB_48101310", "CNB_48492010", "CNB_48784990"];
  var FIBI_ACCTS = ["FIBI_314390", "FIBI_852"];

  function h(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
  function secHead(title, sub) {
    return '<div class="sec-h"><h2>' + F.esc(title) + '</h2>' +
           (sub ? '<div class="sub">' + F.esc(sub) + "</div>" : "") +
           '<div class="rule"></div></div>';
  }
  function signCls(n) { return n < 0 ? "neg" : ""; }

  /* ------------------------------------------------------------- status -- */
  function statusLine() {
    if (!MODEL) return "";
    var read = DB.readAt;
    var hh = String(read.getHours()).padStart(2, "0") + ":" + String(read.getMinutes()).padStart(2, "0");
    return "Balances at " + MODEL.latest + " · Main DB read " + F.iso(read) + " " + hh;
  }

  function errorBox(msg) {
    return '<div class="err-box"><b>Main DB not loaded</b>' + F.esc(msg) +
      "<div class=\"status\">No figures are shown, because none could be read. " +
      "Nothing below is a zero balance.</div></div>";
  }

  /* --------------------------------------------------------- selectors --- */
  function selectors() {
    return '<div class="sel-row">' +
      '<div><label for="selScope">View</label>' +
        '<select id="selScope">' +
          '<option value="starwell">Starwell</option>' +
          '<option value="family">Family (adds Doron and Uziella)</option>' +
        "</select></div>" +
      '<div><label for="selPeriod">Period</label>' +
        '<select id="selPeriod">' +
          '<option value="ytd">Year to date</option>' +
          '<option value="12m">12 months</option>' +
          '<option value="2023">Since Jan 2023</option>' +
        "</select></div>" +

      '<div><label>Currency</label><div class="seg" id="segCcy">' +
        '<button type="button" data-ccy="USD">USD</button>' +
        '<button type="button" data-ccy="ILS">ILS</button>' +
      "</div></div></div>";
  }

  function breakdownRow() {
    return '<div class="sel-row" style="margin-top:14px">' +
      '<div><label for="selGroup">Show</label>' +
        '<select id="selGroup">' +
          '<option value="pool">Whole pool</option>' +
          '<option value="owner">One owner</option>' +
          '<option value="account">One account</option>' +
        "</select></div>" +
      (S.group === "pool" ? "" :
        '<div><label for="selPick">' + (S.group === "owner" ? "Owner" : "Account") + "</label>" +
        '<select id="selPick">' + pickOptions() + "</select></div>") +
      "</div>";
  }
  /* Pick a default as soon as the breakdown changes, so the first paint after
     a switch already has a valid selection rather than reading null. */
  function ensurePick() {
    if (S.group === "pool") { S.pick = null; return; }
    var opts = S.group === "owner" ? ownersInScope() : poolAccounts();
    if (opts.indexOf(S.pick) < 0) S.pick = opts[0] || null;
  }
  function ownersInScope() {
    var seen = {}, out = [];
    poolAccounts().forEach(function (id) {
      var o = (MODEL.accounts[id].owner || "Unassigned").trim();
      if (!seen[o]) { seen[o] = 1; out.push(o); }
    });
    return out.sort();
  }
  function pickOptions() {
    var opts = S.group === "owner" ? ownersInScope() : poolAccounts();
    if (opts.indexOf(S.pick) < 0) S.pick = opts[0];
    return opts.map(function (v) {
      var label = S.group === "owner" ? v
        : ((MODEL.accounts[v].inst ? MODEL.accounts[v].inst + " \u00B7 " : "") + (MODEL.accounts[v].name || v));
      return '<option value="' + F.esc(v) + '"' + (v === S.pick ? " selected" : "") + ">" + F.esc(label) + "</option>";
    }).join("");
  }

  /* ------------------------------------------------------------ period -- */
  function periodStart() {
    var y = ASOF.getUTCFullYear();
    if (S.period === "12m") return new Date(Date.UTC(y - 1, ASOF.getUTCMonth(), 0 + ASOF.getUTCDate()));
    if (S.period === "2023") return new Date(Date.UTC(2022, 11, 31));
    return new Date(Date.UTC(y - 1, 11, 31));
  }
  function periodLabel() {
    return S.period === "12m" ? "12 months" : S.period === "2023" ? "since Jan 2023" : "year to date";
  }

  /* ------------------------------------------- a) headline figures ------- */
  function figures(ids) {
    var T = P.totals(MODEL, ASOF);
    var m = P.periodChange(MODEL, ids, U.prevMonthEnd(ASOF), ASOF);
    var y = P.periodChange(MODEL, ids, periodStart(), ASOF);
    function fig(label, value, caption) {
      return '<div class="fig"><div class="fig-l">' + F.esc(label) + "</div>" +
        '<div class="fig-v">' + value + "</div>" +
        '<div class="fig-c">' + F.esc(caption) + "</div></div>";
    }
    return '<div class="figs">' +
      fig("Under management", F.big(T.aum), "Capital and real estate at " + MODEL.latest) +
      fig("Month change", F.big(m.gain) + "  " + F.pct(m.ret), F.mLong(ASOF) + ", investment gain") +
      fig(periodLabel() === "year to date" ? "Year to date" : periodLabel(),
          F.big(y.gain) + "  " + F.pct(y.ret), "Investment gain, " + periodLabel()) +
      "</div>";
  }

  /* --------------------------------------- b) monthly change ------------- */
  function monthlyTable(series) {
    var rows = series.map(function (s, i) {
      return '<tr class="exp" data-i="' + i + '">' +
        "<td>" + F.esc(s.label) + (s.merged ? ' <span class="muted">merged</span>' : "") + "</td>" +
        '<td class="num hide-sm">' + F.k1(s.start) + "</td>" +
        '<td class="num hide-sm">' + F.k1(s.add) + "</td>" +
        '<td class="num hide-sm">' + F.k1(s.wd) + "</td>" +
        '<td class="num">' + F.k1(s.gain) + "</td>" +
        '<td class="num">' + F.pct(s.ret) + "</td>" +
        '<td class="num hide-sm">' + F.k1(s.end) + "</td></tr>" +
        '<tr class="exp-body hidden" data-body="' + i + '"><td colspan="7"><dl class="kv">' +
          "<dt>Start</dt><dd>" + F.k1(s.start) + "</dd>" +
          "<dt>Additions</dt><dd>" + F.k1(s.add) + "</dd>" +
          "<dt>Withdrawals</dt><dd>" + F.k1(s.wd) + "</dd>" +
          "<dt>End</dt><dd>" + F.k1(s.end) + "</dd>" +
        "</dl></td></tr>";
    }).join("");
    return '<div class="tw"><table id="tblMonthly"><thead><tr>' +
      "<th>Month</th>" +
      '<th class="num hide-sm">Start</th><th class="num hide-sm">Additions</th>' +
      '<th class="num hide-sm">Withdrawals</th>' +
      '<th class="num">Investment gain</th><th class="num">Return</th>' +
      '<th class="num hide-sm">End</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
      '<caption>Figures in ' + (S.ccy === "ILS" ? "₪" : "$") + ' thousands. Return is Modified Dietz, flows dated 15 days before the statement date. Tap a row for the full detail.</caption></div>';
  }

  function drawChart(series) {
    var cv = document.getElementById("chartMonthly");
    if (!cv || !window.Chart) return;
    if (CHART) { CHART.destroy(); CHART = null; }
    var small = window.innerWidth < 640;
    var every = small ? (series.length > 8 ? 3 : 2) : 1;
    CHART = new window.Chart(cv, {
      data: {
        labels: series.map(function (s) { return s.label; }),
        datasets: [
          { type: "bar", label: "Investment gain", yAxisID: "y",
            data: series.map(function (s) { return s.gain; }),
            backgroundColor: series.map(function (s) { return s.gain < 0 ? "#8A8A8A" : "#0A0A0A"; }),
            borderWidth: 0, order: 3 },
          { type: "line", label: "Net flow", yAxisID: "y",
            data: series.map(function (s) { return s.flow; }),
            showLine: false, pointStyle: "rectRot", pointRadius: 6, pointHoverRadius: 8,
            pointBackgroundColor: "rgba(0,0,0,0)", pointBorderColor: "#0A0A0A", pointBorderWidth: 1.5, order: 1 },
          { type: "line", label: "Month-end value", yAxisID: "y1",
            data: series.map(function (s) { return s.end; }),
            borderColor: "#5C5C5C", borderWidth: 1, pointRadius: 0, tension: 0, order: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0A0A0A", borderColor: "#0A0A0A", displayColors: false,
            titleFont: { family: "Times New Roman, Tinos, serif" },
            bodyFont: { family: "Times New Roman, Tinos, serif" },
            callbacks: { label: function (c) { return c.dataset.label + ": " + F.k1(c.parsed.y) + "K"; } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#5C5C5C", maxRotation: 0, autoSkip: false,
               callback: function (v, i) { return i % every === 0 ? this.getLabelForValue(v) : ""; },
               font: { family: "Times New Roman, Tinos, serif", size: small ? 10 : 12 } } },
          y: { grid: { color: "#D6D6D6" }, border: { display: false },
               ticks: { color: "#5C5C5C", font: { family: "Times New Roman, Tinos, serif", size: small ? 10 : 12 },
                        callback: function (v) { return F.k1(v); } } },
          y1: { position: "right", grid: { display: false }, border: { display: false },
                ticks: { color: "#5C5C5C", font: { family: "Times New Roman, Tinos, serif", size: small ? 10 : 12 },
                         callback: function (v) { return F.k1(v); } } }
        }
      }
    });
  }

  function chartLegend() {
    return '<div class="chart-legend">' +
      '<span><i style="background:#0A0A0A"></i>Investment gain</span>' +
      '<span><i style="background:#8A8A8A"></i>Loss</span>' +
      '<span><i style="border:1.5px solid #0A0A0A;background:transparent;transform:rotate(45deg)"></i>Net flow</span>' +
      '<span><i style="background:#5C5C5C;height:1px;margin-bottom:5px"></i>Month-end value</span>' +
      "</div>";
  }

  /* ------------------------------------------------- c) capital table ---- */
  function capitalTable(ids) {
    var T = P.totals(MODEL, ASOF), r = "";
    T.rows.forEach(function (a) {
      var acc = MODEL.accounts[a.id];
      r += "<tr><td>" + F.esc((acc.inst ? acc.inst + " · " : "") + (acc.name || a.id)) +
        (a.stale ? ' <span class="muted">as of ' + a.at + "</span>" : "") +
        '</td><td class="num">' + F.k1(a.value) + "</td></tr>";
    });
    r += '<tr><td>Less FIBI loan <span class="muted">' + F.esc(MODEL.loanLabel) + "</span></td>" +
         '<td class="num">' + F.k1(T.loan) + "</td></tr>";
    r += '<tr class="head-row"><td>L&amp;A Holdings</td><td class="num">' + F.k1(T.la) + "</td></tr>";
    MODEL.la.forEach(function (f) {
      r += '<tr><td class="sub">' + F.esc(f.name) + '</td><td class="num">' + F.k1(f.value) + "</td></tr>";
    });
    r += '<tr class="head-row"><td>Real estate</td><td class="num">' + F.k1(T.re) + "</td></tr>";
    r += '<tr><td class="sub">20 Vitkin Street</td><td class="num">' + F.k1(MODEL.vit) + "</td></tr>";
    MODEL.props.forEach(function (p) {
      r += '<tr><td class="sub">' + F.esc(p.name) + '</td><td class="num">' + F.k1(p.value) + "</td></tr>";
    });
    r += '<tr class="total"><td>Under management</td><td class="num">' + F.k1(T.aum) + "</td></tr>";
    return '<div class="tw"><table><thead><tr><th>Position</th><th class="num">Value</th></tr></thead>' +
      "<tbody>" + r + "</tbody></table>" +
      '<caption>Figures in ' + (S.ccy === "ILS" ? "₪" : "$") + " thousands at " + MODEL.latest +
      ". Jewelry is held as a personal asset and is not in these figures.</caption></div>";
  }

  /* ------------------------------------------------ d) accounts table ---- */
  function accountsTable(ids) {
    var dec = lastDecember();
    var rows = ids.map(function (id, i) {
      var acc = MODEL.accounts[id], v = MODEL.valueAt(id, ASOF);
      var m = P.periodChange(MODEL, [id], U.prevMonthEnd(ASOF), ASOF);
      var y = P.periodChange(MODEL, [id], periodStart(), ASOF);
      var isFibi = FIBI_ACCTS.indexOf(id) >= 0;
      function irr(yrs) {
        if (isFibi) return "n/m";
        var from = new Date(Date.UTC(dec.getUTCFullYear() - yrs, 11, 31));
        if (!MODEL.started(id, from)) return "n/a";
        var r = P.acctIRR(MODEL, [id], from, dec);
        return r === null ? "n/a" : F.pct(r, 1);
      }
      return '<tr class="exp" data-i="a' + i + '"><td>' +
          F.esc((acc.inst ? acc.inst + " · " : "") + (acc.name || id)) +
          (v.at && v.at < F.iso(ASOF) ? ' <span class="muted">as of ' + v.at + "</span>" : "") +
        '</td><td class="num">' + F.k1(v.usd) + "</td>" +
        '<td class="num hide-sm">' + F.pct(m.ret) + "</td>" +
        '<td class="num">' + F.pct(y.ret) + "</td>" +
        '<td class="num hide-sm">' + irr(3) + "</td>" +
        '<td class="num hide-sm">' + irr(5) + "</td></tr>" +
        '<tr class="exp-body hidden" data-body="a' + i + '"><td colspan="6"><dl class="kv">' +
          "<dt>Owner</dt><dd>" + F.esc(acc.owner || "n/a") + "</dd>" +
          "<dt>Month</dt><dd>" + F.pct(m.ret) + "</dd>" +
          "<dt>3-yr IRR</dt><dd>" + irr(3) + "</dd>" +
          "<dt>5-yr IRR</dt><dd>" + irr(5) + "</dd>" +
        "</dl></td></tr>";
    }).join("");
    return '<div class="tw"><table><thead><tr><th>Account</th><th class="num">Value</th>' +
      '<th class="num hide-sm">Month</th><th class="num">' + (S.period === "ytd" ? "YTD" : "Period") + "</th>" +
      '<th class="num hide-sm">3-yr IRR</th><th class="num hide-sm">5-yr IRR</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table>" +
      "<caption>Money-weighted return (XIRR) on year-end statements through " +
      F.mLong(dec) + ". FIBI accounts are marked n/m because their history is " +
      "restated in the workbook notes. Figures in " + (S.ccy === "ILS" ? "₪" : "$") +
      " thousands. Tap a row for the full detail.</caption></div>";
  }
  function lastDecember() {
    var y = ASOF.getUTCFullYear();
    return ASOF.getUTCMonth() >= 11 ? new Date(Date.UTC(y, 11, 31)) : new Date(Date.UTC(y - 1, 11, 31));
  }

  /* --------------------------------------------------- e) allocation ----- */
  function allocationTable(ids) {
    var T = P.totals(MODEL, ASOF);
    function sumOf(list) {
      return list.reduce(function (s, id) { return s + (ids.indexOf(id) >= 0 ? MODEL.valueAt(id, ASOF).usd : 0); }, 0);
    }
    var usSec = sumOf(US_ACCTS);
    var fibiNet = sumOf(FIBI_ACCTS) + T.loan;
    var cash = MODEL.la.filter(function (f) { return /cash/i.test(f.name); })
                       .reduce(function (s, f) { return s + f.value; }, 0);
    var priv = T.la - cash;
    var re = T.re;
    var total = usSec + fibiNet + cash + priv + re;
    var lines = [
      ["Listed securities, US", usSec], ["FIBI, net of loan", fibiNet],
      ["Cash", cash], ["Private funds", priv], ["Real estate", re]
    ];
    function block(title, arr, tot) {
      return '<tr class="head-row"><td>' + title + '</td><td class="num"></td><td class="num"></td></tr>' +
        arr.map(function (l) {
          return '<tr><td class="sub">' + F.esc(l[0]) + '</td><td class="num">' + F.k1(l[1]) + "</td>" +
            '<td class="num">' + (tot ? F.pct(l[1] / tot, 1) : "n/a") + "</td></tr>";
        }).join("");
    }
    var ils = sumOf(FIBI_ACCTS) + T.loan;
    var usd = total - ils;
    return '<div class="tw"><table><thead><tr><th>Allocation</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>' +
      block("By asset", lines, total) +
      '<tr class="total"><td>Total</td><td class="num">' + F.k1(total) + '</td><td class="num">100.0%</td></tr>' +
      block("By currency", [["USD", usd], ["ILS", ils]], total) +
      "</tbody></table>" +
      '<caption>Figures in ' + (S.ccy === "ILS" ? "₪" : "$") + " thousands at " + MODEL.latest + ".</caption></div>";
  }

  /* ------------------------------------------------- f) data checks ------ */
  function dataChecks(ids, series) {
    var c = MODEL.checks, items = [];
    c.dupes.forEach(function (d) { items.push("Duplicate statement · " + d); });
    ids.forEach(function (id) {
      var v = MODEL.valueAt(id, ASOF);
      if (v.at && v.at < MODEL.latest) items.push("Stale · " + id + " latest statement " + v.at + ", carried forward");
    });
    series.forEach(function (s) { if (s.merged) items.push("Missing month · " + s.long + " reported as one period"); });
    c.notes.slice(0, 12).forEach(function (n) { items.push("Note to settle · " + n); });
    items.push("Pool money-weighted return computes as reported here; the quarterly deck shows 21.6% and 11.2% for three and five years and the convention behind those has not been identified.");
    return '<details class="checks"><summary>Data checks (' + items.length + ")</summary><ul>" +
      items.map(function (i) { return "<li>" + F.esc(i) + "</li>"; }).join("") + "</ul></details>";
  }

  /* ------------------------------------------------------------ CSV ----- */
  function csv(series) {
    var head = ["Month", "Start", "Additions", "Withdrawals", "Investment gain", "Return %", "End"];
    var lines = [head.join(",")];
    series.forEach(function (s) {
      lines.push([s.label, s.start.toFixed(2), s.add.toFixed(2), s.wd.toFixed(2),
                  s.gain.toFixed(2), s.ret === null ? "" : (s.ret * 100).toFixed(2), s.end.toFixed(2)]
        .map(function (v) { return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "starwell-monthly-" + MODEL.latest + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ----------------------------------------------------------- render --- */
  function poolAccounts() {
    if (S.scope === "starwell") return P.STARWELL.filter(function (a) { return MODEL.accounts[a]; });
    return Object.keys(MODEL.accounts).filter(function (a) { return (MODEL.accounts[a].dates || []).length; });
  }
  /* The breakdown drives the monthly change section only. Under management,
     capital, accounts and allocation stay on the whole scope, so the headline
     never silently changes meaning when the chart is narrowed. */
  function seriesIds() {
    var pool = poolAccounts();
    if (S.group === "account") return pool.indexOf(S.pick) >= 0 ? [S.pick] : pool;
    if (S.group === "owner") {
      var sel = pool.filter(function (a) { return (MODEL.accounts[a].owner || "Unassigned").trim() === S.pick; });
      return sel.length ? sel : pool;
    }
    return pool;
  }

  function paint() {
    var root = document.getElementById("portalBody");
    if (!root) return;
    ensurePick();
    var list = poolAccounts();          // headline, capital, accounts, allocation
    var sIds = seriesIds();             // monthly change only
    var series = P.monthSeries(MODEL, sIds, periodStart(), ASOF);
    var sLabel = S.group === "pool" ? "the whole pool"
      : S.group === "owner" ? S.pick
      : ((MODEL.accounts[S.pick] || {}).name || S.pick);
    root.innerHTML =
      selectors() +
      '<div class="sec">' + figures(list) + "</div>" +
      '<div class="sec">' + secHead("Monthly change", "Investment gain, net flows and month-end value for " + sLabel) +
        breakdownRow() +
        '<div class="chart-wrap"><canvas id="chartMonthly"></canvas></div>' + chartLegend() +
        '<div style="margin-top:18px">' + monthlyTable(series) + "</div>" +
        '<div style="margin-top:12px"><button class="btn ghost sm" id="btnCsv">Export CSV</button></div>' +
      "</div>" +
      '<div class="sec">' + secHead("Capital", "Accounts, L&A Holdings and real estate") + capitalTable(list) + "</div>" +
      '<div class="sec">' + secHead("Accounts", "Value and money-weighted return") + accountsTable(list) + "</div>" +
      '<div class="sec">' + secHead("Allocation", "By asset and by currency") + allocationTable(list) + "</div>" +
      '<div class="sec">' + dataChecks(list, series) + "</div>";

    var st = document.getElementById("portalStatus");
    if (st) st.textContent = statusLine();

    document.getElementById("selScope").value = S.scope;
    document.getElementById("selPeriod").value = S.period;
    document.getElementById("selGroup").value = S.group;
    var pickEl = document.getElementById("selPick");
    if (pickEl) pickEl.addEventListener("change", function (e) { S.pick = e.target.value; paint(); });
    Array.prototype.forEach.call(document.querySelectorAll("#segCcy button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-ccy") === S.ccy);
    });

    /* charts are drawn after the markup so nothing shifts when data lands */
    if ("requestIdleCallback" in window) window.requestIdleCallback(function () { drawChart(series); });
    else setTimeout(function () { drawChart(series); }, 0);

    root.querySelectorAll("tr.exp").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var b = root.querySelector('[data-body="' + tr.getAttribute("data-i") + '"]');
        if (b) b.classList.toggle("hidden");
      });
    });
    document.getElementById("btnCsv").addEventListener("click", function () { csv(series); });
    ["selScope", "selPeriod", "selGroup"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function (e) {
        var key = id === "selScope" ? "scope" : id === "selPeriod" ? "period" : "group";
        S[key] = e.target.value;
        if (key === "group") S.pick = null;
        paint();
      });
    });
    document.getElementById("segCcy").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      S.ccy = b.getAttribute("data-ccy"); paint();
    });
  }

  function skeleton() {
    var root = document.getElementById("portalBody");
    if (!root) return;
    var fig = '<div class="fig"><span class="skel" style="width:40%"></span>' +
              '<span class="skel v" style="margin-top:10px"></span></div>';
    root.innerHTML = '<div class="figs">' + fig + fig + fig + "</div>" +
      '<div class="sec" style="margin-top:28px"><span class="skel" style="width:30%;height:16px"></span>' +
      '<div class="chart-wrap" style="background:#F4F4F4;margin-top:16px"></div></div>';
  }

  function mount() {
    skeleton();
    ASOF = null;
    P.readMainDB().then(function (db) {
      DB = db;
      MODEL = P.build(db);
      if (!MODEL.latest) throw new Error("Main DB returned no statement rows.");
      ASOF = F.toDate(MODEL.latest);
      if (window.console && console.info) console.info("Main DB: " + db.log.join(" | "));
      paint();
    }).catch(function (e) {
      var root = document.getElementById("portalBody");
      if (root) root.innerHTML = errorBox(": " + (e && e.message ? e.message : String(e)));
      var st = document.getElementById("portalStatus");
      if (st) st.textContent = "Main DB not loaded";
    });
  }

  window.addEventListener("resize", function () {
    clearTimeout(window.__pz);
    window.__pz = setTimeout(function () { if (MODEL) paint(); }, 250);
  });

  P.mount = mount;
})();
