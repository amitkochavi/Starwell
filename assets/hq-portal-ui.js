/* Starwell Portal — rendering. Reads nothing itself: it takes the model from
   hq-dashboard.js and the index levels from hq-benchmarks.js, and draws the
   deck in black and white.

   No figure is typed into this file. Every number on the page is computed
   from Main DB at run time. Direction is carried by the sign, never by
   colour. Every figure carries the sheet and rows it came from, shown on
   hover and in the row you tap open. */

(function () {
  "use strict";
  var P = window.StarwellPortal;
  if (!P) return;
  var B = window.StarwellBenchmarks;
  var CFG = window.STARWELL_SETTINGS;

  var F = P.fmt, U = P.util, S = P.state;
  var MODEL = null, DB = null, ASOF = null, SB = null, WHO = "";
  var BENCH = null, BENCH_TRIED = false;
  var SNAPS = [];
  var CHARTS = {};

  function destroyCharts() {
    Object.keys(CHARTS).forEach(function (k) { if (CHARTS[k]) { CHARTS[k].destroy(); delete CHARTS[k]; } });
  }
  function small() { return window.innerWidth < 640; }
  var SERIF = "Times New Roman, Tinos, serif";
  var INK = "#0A0A0A", G1 = "#3C3C3C", G2 = "#5C5C5C", G3 = "#8A8A8A", G4 = "#B8B8B8", G5 = "#D6D6D6";
  var GREYS = [INK, "#4A4A4A", G3, G4, G5];

  function secHead(title, sub) {
    return '<div class="sec-h"><h2>' + F.esc(title) + "</h2>" +
           (sub ? '<div class="sub">' + F.esc(sub) + "</div>" : "") +
           '<div class="rule"></div></div>';
  }
  /* every figure says where it came from */
  function src(text) { return text ? ' title="' + F.esc(text) + '"' : ""; }
  function srcOf(ids, at) {
    return "Statements: " + (Array.isArray(ids) ? ids.join(", ") : ids) + ", " + at;
  }

  /* ------------------------------------------------------------- status -- */
  function statusLine() {
    if (!MODEL) return "";
    var read = DB.readAt;
    var hh = String(read.getHours()).padStart(2, "0") + ":" + String(read.getMinutes()).padStart(2, "0");
    var frozen = S.asAt ? " · showing the frozen quarter at " + S.asAt : "";
    return "Balances at " + F.iso(ASOF) + " · Main DB read " + F.iso(read) + " " + hh + frozen;
  }
  function errorBox(msg) {
    return '<div class="err-box"><b>Main DB not loaded</b>' + F.esc(msg) +
      '<div class="status">No figures are shown, because none could be read. ' +
      "Nothing below is a zero balance.</div></div>";
  }
  function notInDb(what) {
    return '<span class="nid" title="' + F.esc(what) + '">Not in Main DB</span>';
  }

  /* --------------------------------------------------------- selectors --- */
  function selectors() {
    var snapOpts = '<option value="">Live, at ' + F.esc(MODEL.latest) + "</option>" +
      SNAPS.map(function (s) {
        return '<option value="' + F.esc(s.as_of) + '"' + (S.asAt === s.as_of ? " selected" : "") + ">" +
          F.esc(s.quarter + " frozen at " + s.as_of) + "</option>";
      }).join("");
    return '<div class="sel-row">' +
      '<div><label for="selScope">View</label>' +
        '<select id="selScope">' +
          '<option value="starwell">Starwell</option>' +
          '<option value="family">Family (adds Doron and Uziella)</option>' +
        "</select></div>" +
      '<div><label for="selPeriod">Period</label>' +
        '<select id="selPeriod">' + periodOptions() + "</select></div>" +
      '<div><label for="selAsAt">As at</label><select id="selAsAt">' + snapOpts + "</select></div>" +
      '<div><label>Currency</label><div class="seg" id="segCcy">' +
        '<button type="button" data-ccy="USD">USD</button>' +
        '<button type="button" data-ccy="ILS">ILS</button>' +
      "</div></div></div>" +
      (S.ccy === "ILS" ? '<div class="status">' + F.esc(fxNote()) + "</div>" : "");
  }
  /* the "since" option starts at the earliest December Main DB can price the
     whole pool from, so the list is never a typed year */
  function earliestFullYear() {
    var ids = poolAccounts(), best = null;
    ids.forEach(function (id) {
      var ds = MODEL.accounts[id].dates || [];
      if (!ds.length) return;
      if (!best || ds[0] > best) best = ds[0];
    });
    return best ? F.toDate(best).getUTCFullYear() : ASOF.getUTCFullYear() - 1;
  }
  function periodOptions() {
    var y = earliestFullYear() + 1;
    return '<option value="ytd">Year to date</option>' +
      '<option value="12m">12 months</option>' +
      '<option value="since">Since Jan ' + y + "</option>";
  }
  function fxNote() {
    if (!MODEL.fx) return "No FX rate in Main DB, so shekel figures cannot be shown.";
    return "Converted at " + MODEL.fx.rate.toFixed(4) + " shekels to the dollar, from Main DB (" +
      MODEL.fx.from + ", " + MODEL.fx.at + ").";
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
  function label(id) { return (MODEL.accounts[id] || {}).label || id; }
  function pickOptions() {
    var opts = S.group === "owner" ? ownersInScope() : poolAccounts();
    if (opts.indexOf(S.pick) < 0) S.pick = opts[0];
    return opts.map(function (v) {
      return '<option value="' + F.esc(v) + '"' + (v === S.pick ? " selected" : "") + ">" +
        F.esc(S.group === "owner" ? v : label(v)) + "</option>";
    }).join("");
  }

  /* ------------------------------------------------------------ period -- */
  function periodStart() {
    var y = ASOF.getUTCFullYear();
    if (S.period === "12m") return new Date(Date.UTC(y - 1, ASOF.getUTCMonth(), ASOF.getUTCDate()));
    if (S.period === "since") return new Date(Date.UTC(earliestFullYear(), 11, 31));
    return new Date(Date.UTC(y - 1, 11, 31));
  }
  function periodLabel() {
    return S.period === "12m" ? "12 months"
      : S.period === "since" ? "since Jan " + (earliestFullYear() + 1)
      : "year to date";
  }

  /* --------------------------------------------------------- a) alerts -- */
  function alertStrip(ids) {
    var list = P.alerts(MODEL, ids, ASOF);
    if (!list.length) return "";
    return '<div class="alerts" role="status">' + list.map(function (a) {
      return '<div class="alert"' + src(a.src) + "><b>" + F.esc(a.kind) + "</b> " + F.esc(a.text) + "</div>";
    }).join("") + "</div>";
  }

  /* ----------------------------------------------- b) headline figures --- */
  /* The amount and the percentage read as one signed figure. There is no
     green and no red anywhere on the page: the minus sign carries it. */
  function figures(ids) {
    var T = P.totals(MODEL, ASOF);
    var m = P.periodChange(MODEL, ids, U.prevMonthEnd(ASOF), ASOF);
    var y = P.periodChange(MODEL, ids, periodStart(), ASOF);
    function fig(l, value, caption, source) {
      return '<div class="fig"' + src(source) + '><div class="fig-l">' + F.esc(l) + "</div>" +
        '<div class="fig-v">' + value + "</div>" +
        '<div class="fig-c">' + F.esc(caption) + "</div></div>";
    }
    /* The amount carries the figure in near black; the percentage sits beside
       it a size down and takes the direction colour. */
    function change(gain, ret) {
      var cls = gain < 0 ? "dn" : gain > 0 ? "up" : "";
      return F.bigSigned(gain) + '<span class="fig-sep">·</span>' +
             '<span class="fig-pct ' + cls + '">' + F.pctSigned(ret) + "</span>";
    }
    var all = srcOf(ids, MODEL.latest);
    return '<div class="figs">' +
      fig("Under management", F.big(T.aum), "Capital and real estate at " + MODEL.latest,
          all + "; Investment Ledger; Glaser Real Estate; 20 Vitkin Street - APT #2" +
          (MODEL.liabilitiesSheet ? "; Liabilities" : "")) +
      fig("Month change", change(m.gain, m.ret), F.mLong(ASOF) + ", investment gain",
          all + "; previous month end " + F.iso(U.prevMonthEnd(ASOF))) +
      fig(periodLabel() === "year to date" ? "Year to date" : periodLabel(),
          change(y.gain, y.ret), "Investment gain, " + periodLabel(),
          all + "; period start " + F.iso(periodStart())) +
      "</div>";
  }

  /* ----------------------------------------------- c) monthly change ----- */
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
          "<dt>Cumulative gain</dt><dd>" + F.k1(s.cum) + "</dd>" +
          "<dt>End</dt><dd>" + F.k1(s.end) + "</dd>" +
          "<dt>Source</dt><dd>Statements, " + F.esc(F.iso(s.from)) + " to " + F.esc(F.iso(s.to)) + "</dd>" +
        "</dl></td></tr>";
    }).join("");
    return '<div class="tw"><table id="tblMonthly"><thead><tr>' +
      "<th>Month</th>" +
      '<th class="num hide-sm">Start</th><th class="num hide-sm">Additions</th>' +
      '<th class="num hide-sm">Withdrawals</th>' +
      '<th class="num">Investment gain</th><th class="num">Return</th>' +
      '<th class="num hide-sm">End</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
      "<caption>Figures in " + cur() + " thousands. Return is Modified Dietz, flows dated " +
      U.conv("flowLagDays") + " days before the statement date. Tap a row for the full detail.</caption></div>";
  }
  function cur() { return S.ccy === "ILS" ? "₪" : "$"; }

  /* The line is the cumulative investment gain since the period started, so
     a deposit does not read as growth. Month-end value is a toggle. */
  function drawMonthly(series) {
    var cv = document.getElementById("chartMonthly");
    if (!cv || !window.Chart) return;
    if (CHARTS.monthly) { CHARTS.monthly.destroy(); delete CHARTS.monthly; }
    var sm = small(), every = sm ? (series.length > 8 ? 3 : 2) : 1;
    var lineGain = S.chartLine === "gain";
    var lineData = series.map(function (s) { return lineGain ? s.cum : s.end; });

    /* A net flow far outside the gain scale is shown as a labelled arrow at
       the edge of the plot, not as a point clipped off the chart. */
    var gains = series.map(function (s) { return s.gain; });
    /* The left scale has to hold the bars and, when the line is the
       cumulative gain, the line as well: it shares that scale and runs well
       above any single month, so sizing on the bars alone clips it. */
    var onY = lineGain ? gains.concat(lineData) : gains;
    var gmax = Math.max.apply(null, onY.concat([0])), gmin = Math.min.apply(null, onY.concat([0]));
    var pad = Math.max(Math.abs(gmax), Math.abs(gmin)) * 0.2 || 1;
    var hi = gmax + pad, lo = gmin - pad;
    /* A flow that is off the scale is left out of the series, so no marker is
       drawn half clipped on the edge, and is shown instead as an arrow with
       its amount. The arrow is drawn inside the plot, pointing out of it, so
       nothing is painted over the controls above the chart. */
    var offscale = [];
    var flowPts = series.map(function (s, i) {
      if (s.flow > hi) { offscale.push({ i: i, v: s.flow, up: true }); return null; }
      if (s.flow < lo) { offscale.push({ i: i, v: s.flow, up: false }); return null; }
      return s.flow;
    });
    var arrows = {
      id: "offscaleArrows",
      afterDatasetsDraw: function (c) {
        if (!offscale.length) return;
        var x = c.scales.x, area = c.chartArea, ctx = c.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        ctx.clip();                       // never paint outside the plot
        ctx.font = (sm ? 9 : 11) + "px " + SERIF;
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.textAlign = "center";
        offscale.forEach(function (o) {
          var px = x.getPixelForValue(o.i);
          var edge = o.up ? area.top + 1 : area.bottom - 1;
          var dir = o.up ? 1 : -1;        // the stem runs back into the plot
          ctx.beginPath();
          ctx.moveTo(px, edge); ctx.lineTo(px, edge + dir * 10);
          ctx.moveTo(px - 3.5, edge + dir * 5); ctx.lineTo(px, edge);
          ctx.lineTo(px + 3.5, edge + dir * 5);
          ctx.stroke();
          ctx.textBaseline = o.up ? "top" : "bottom";
          ctx.fillText(F.axis(o.v), px, edge + dir * 13);
        });
        ctx.restore();
      }
    };

    CHARTS.monthly = new window.Chart(cv, {
      data: {
        labels: series.map(function (s) { return s.label; }),
        datasets: [
          { type: "bar", label: "Investment gain", yAxisID: "y",
            data: gains,
            backgroundColor: series.map(function (s) { return s.gain < 0 ? G3 : INK; }),
            borderWidth: 0, order: 3 },
          { type: "line", label: "Net flow", yAxisID: "y",
            data: flowPts,
            showLine: false, pointStyle: "rectRot", pointRadius: 6, pointHoverRadius: 8,
            pointBackgroundColor: "rgba(0,0,0,0)", pointBorderColor: INK, pointBorderWidth: 1.5, order: 1 },
          { type: "line", label: lineGain ? "Cumulative investment gain" : "Month-end value",
            yAxisID: lineGain ? "y" : "y1",
            data: lineData,
            borderColor: G2, borderWidth: 1.4, pointRadius: 0, tension: 0, order: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: INK, borderColor: INK, displayColors: false,
            titleFont: { family: SERIF }, bodyFont: { family: SERIF },
            callbacks: {
              label: function (c) {
                var v = c.dataset.label === "Net flow" ? series[c.dataIndex].flow : c.parsed.y;
                return c.dataset.label + ": " + F.axis(v);
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: G2, maxRotation: 0, autoSkip: false,
               callback: function (v, i) { return i % every === 0 ? this.getLabelForValue(v) : ""; },
               font: { family: SERIF, size: sm ? 10 : 12 } } },
          y: { min: lo, max: hi, grid: { color: G5 }, border: { display: false },
               ticks: { color: G2, font: { family: SERIF, size: sm ? 10 : 12 },
                        callback: function (v) { return F.axis(v); } } },
          y1: { display: !lineGain, position: "right", grid: { display: false }, border: { display: false },
                ticks: { color: G2, font: { family: SERIF, size: sm ? 10 : 12 },
                         callback: function (v) { return F.axis(v); } } }
        }
      },
      plugins: [arrows]
    });
  }
  function monthlyLegend() {
    var lineName = S.chartLine === "gain" ? "Cumulative investment gain" : "Month-end value";
    return '<div class="chart-legend">' +
      '<span><i style="background:' + INK + '"></i>Investment gain</span>' +
      '<span><i style="background:' + G3 + '"></i>Loss</span>' +
      '<span><i style="border:1.5px solid ' + INK + ';background:transparent;transform:rotate(45deg)"></i>Net flow</span>' +
      '<span><i style="background:' + G2 + ';height:1px;margin-bottom:5px"></i>' + lineName + "</span>" +
      "</div>";
  }

  /* --------------------------------- d) performance against markets ------ */
  function marketsSection(ids) {
    var head = secHead("Performance against markets",
      "The pool's time-weighted return beside the indexes, over the same months");
    if (!BENCH) {
      return head + '<div class="err-box soft"><b>No index data</b>' +
        "Main DB has no Benchmarks sheet and the benchmarks table is empty, so nothing is compared here. " +
        "Either add a sheet named Benchmarks with the columns Month, Benchmark, TotalReturnIndex, or deploy and schedule " +
        "the function in supabase/functions/benchmarks, which fetches the levels server side and keeps the provider key as a secret." +
        "</div>";
    }
    var shown = CFG.benchmarks.filter(function (b) { return !b.hidden && BENCH.series[b.key] && BENCH.series[b.key].length; });
    if (!shown.length) {
      return head + '<div class="err-box soft"><b>No index data</b>' +
        "The benchmark source holds no series this page can read." + "</div>";
    }

    var start = periodStart(), startIso = F.iso(start), toIso = F.iso(ASOF);
    var exFibi = ids.filter(function (id) { return CFG.returnsNotMeaningful.accounts.indexOf(id) < 0; });

    /* The long windows are anchored on year ends, not on a rolling date.
       Main DB holds a statement for every account at each December and then
       monthly from the point it starts; a rolling start such as "three years
       ago today" falls on a date the workbook cannot price, and the pool
       would be measured from whatever older statement was carried forward.
       Each long window therefore runs from the December N years before the
       last December through to the reporting date, and is annualised over
       the time that actually elapsed. The index gets exactly the same
       window, so the two sides stay comparable. */
    var decY = lastDecember().getUTCFullYear();
    function yearEndWindow(n) { return [(decY - n) + "-12-31", toIso]; }
    function windowFor(key) {
      if (key === "month") return [F.iso(U.prevMonthEnd(ASOF)), toIso];
      if (key === "period") return [startIso, toIso];
      return yearEndWindow(Number(key));
    }
    function spanNote(n) {
      var w = yearEndWindow(n);
      var yrs = U.days(F.toDate(w[0]), ASOF) / U.conv("dayCount");
      return w[0] + " to " + toIso + ", " + yrs.toFixed(1) + " years, annualised";
    }
    var COLS = [
      { key: "month", head: "Month", ann: false, note: "the month to " + toIso },
      { key: "period", head: S.period === "ytd" ? "YTD" : "Period", ann: false, note: startIso + " to " + toIso },
      { key: "3", head: "3-yr p.a.", ann: true, note: spanNote(3) },
      { key: "5", head: "5-yr p.a.", ann: true, note: spanNote(5) },
      { key: "7", head: "7-yr p.a.", ann: true, note: spanNote(7) }
    ];

    function poolRow(name, accs) {
      var cells = COLS.map(function (c) {
        var w = windowFor(c.key);
        var r = B.poolTWR(MODEL, accs, F.toDate(w[0]), F.toDate(w[1]));
        return { v: c.ann ? r.ann : r.ret, how: r.method };
      });
      return { name: name, cells: cells, bold: true };
    }
    function benchRow(b) {
      var cells = COLS.map(function (c) {
        var w = windowFor(c.key);
        var s = BENCH.series[b.key];
        return { v: c.ann ? B.annRet(s, w[0], w[1]) : B.ret(s, w[0], w[1]), how: b.kind };
      });
      return { name: b.name, cells: cells, kind: b.kind };
    }
    var rows = [poolRow("Pool", ids), poolRow("Pool, excluding FIBI", exFibi)];
    shown.forEach(function (b) { rows.push(benchRow(b)); });

    /* the two difference rows the review asks for, in percentage points */
    function diffRow(againstKey, againstName) {
      var b = BENCH.series[againstKey];
      if (!b) return null;
      var cells = COLS.map(function (c, i) {
        var pv = rows[0].cells[i].v;
        var w = windowFor(c.key);
        var bv = c.ann ? B.annRet(b, w[0], w[1]) : B.ret(b, w[0], w[1]);
        return { v: (pv === null || bv === null) ? null : pv - bv, points: true };
      });
      return { name: "Pool vs " + againstName + ", points", cells: cells, diff: true };
    }
    [["SP500", "S&P 500"], ["ACWI", "MSCI ACWI"]].forEach(function (p) {
      var r = diffRow(p[0], p[1]);
      if (r) rows.push(r);
    });

    var body = rows.map(function (r) {
      return "<tr" + (r.bold ? ' class="head-row"' : r.diff ? ' class="diff-row"' : "") + "><td>" + F.esc(r.name) +
        (r.kind ? ' <span class="muted">' + F.esc(r.kind) + "</span>" : "") + "</td>" +
        r.cells.map(function (c, i) {
          var cls = i > 1 ? "num hide-sm" : "num";
          var txt = c.v === null ? "n/a" : c.points ? F.pts(c.v) : F.pctSigned(c.v, 1);
          return '<td class="' + cls + '"' + src(c.how || "") + ">" + txt + "</td>";
        }).join("") + "</tr>";
    }).join("");

    var chips = CFG.benchmarks.filter(function (b) { return !b.hidden && BENCH.series[b.key]; })
      .map(function (b) {
        return '<button type="button" class="chip' + (S.bench.indexOf(b.key) >= 0 ? " on" : "") +
          '" data-bench="' + F.esc(b.key) + '">' + F.esc(b.name) + "</button>";
      }).join("");

    var years = [];
    for (var y = F.toDate(startIsoForYears()).getUTCFullYear(); y <= ASOF.getUTCFullYear(); y++) years.push(y);

    return head +
      '<div class="tw"><table><thead><tr><th>Series</th>' +
        COLS.map(function (c, i) {
          return '<th class="' + (i > 1 ? "num hide-sm" : "num") + '"' + src(c.note) + ">" + F.esc(c.head) + "</th>";
        }).join("") +
      "</tr></thead><tbody>" + body + "</tbody></table>" +
      "<caption>Pool: time-weighted, after fees. Indexes: total return via ETF proxies, after ETF fees. " +
      "The annualised columns run from the December that many years before " + decY +
      " through to " + F.esc(toIso) + ", because that is the last date before " +
      "the monthly statements at which Main DB can price every account; the indexes use the same window. " +
      "Index data through " + F.esc(BENCH.through) + " · source " + F.esc(BENCH.source) + ". " +
      "A money-weighted return is never compared with an index.</caption></div>" +

      '<div class="chips" id="benchChips">' + chips + "</div>" +
      '<div class="chart-wrap"><canvas id="chartGrowth"></canvas></div>' +
      '<div class="cap">Growth of ' + cur() + "100 from " + F.esc(startIso) + ".</div>" +

      '<div class="grid2">' +
        '<div><div class="chart-wrap sm"><canvas id="chartYears"></canvas></div>' +
          '<div class="cap">Calendar year returns, ' + years[0] + " to " + years[years.length - 1] + " to date.</div></div>" +
        '<div><div class="chart-wrap sm"><canvas id="chartDraw"></canvas></div>' +
          '<div class="cap">Drawdown from the running peak, pool and S&amp;P 500.</div></div>' +
      "</div>" +
      '<div class="chart-wrap sm"><canvas id="chartExcess"></canvas></div>' +
      '<div class="cap">Excess return by month against the S&amp;P 500, in percentage points.</div>';
  }
  function startIsoForYears() {
    var y = earliestFullYear() + 1;
    return y + "-01-01";
  }

  function drawMarkets(ids) {
    if (!BENCH || !window.Chart) return;
    var startIso = F.iso(periodStart()), toIso = F.iso(ASOF);
    var picked = CFG.benchmarks.filter(function (b) { return S.bench.indexOf(b.key) >= 0 && BENCH.series[b.key]; });

    /* growth of 100 */
    var cv = document.getElementById("chartGrowth");
    if (cv) {
      var poolPts = B.poolGrowth100(MODEL, ids, periodStart(), ASOF);
      var labels = poolPts.map(function (p) { return p.at; });
      var ds = [{ label: "Pool", data: poolPts.map(function (p) { return p.v; }),
                  borderColor: INK, borderWidth: 2, pointRadius: 0, tension: 0 }];
      picked.forEach(function (b, i) {
        var g = B.growth100(BENCH.series[b.key], startIso, toIso);
        var by = {}; g.forEach(function (p) { by[p.at] = p.v; });
        ds.push({ label: b.name, data: labels.map(function (l) { return by[l] === undefined ? null : by[l]; }),
                  borderColor: GREYS[(i + 1) % GREYS.length], borderWidth: 1.2, borderDash: [4, 3],
                  pointRadius: 0, tension: 0, spanGaps: true });
      });
      CHARTS.growth = line(cv, labels.map(shortMonth), ds, function (v) { return cur() + Math.round(v); });
    }

    /* calendar years */
    var cy = document.getElementById("chartYears");
    if (cy) {
      var y0 = F.toDate(startIsoForYears()).getUTCFullYear(), yrs = [];
      for (var y = y0; y <= ASOF.getUTCFullYear(); y++) yrs.push(y);
      var poolBars = yrs.map(function (yy) {
        var a = new Date(Date.UTC(yy - 1, 11, 31));
        var b = yy === ASOF.getUTCFullYear() ? ASOF : new Date(Date.UTC(yy, 11, 31));
        var r = B.poolTWR(MODEL, ids, a, b);
        return r.ret === null ? null : r.ret * 100;
      });
      var sets = [{ label: "Pool", data: poolBars, backgroundColor: INK, borderWidth: 0 }];
      picked.forEach(function (b, i) {
        sets.push({ label: b.name, borderWidth: 0, backgroundColor: GREYS[(i + 1) % GREYS.length],
          data: yrs.map(function (yy) {
            var to = yy === ASOF.getUTCFullYear() ? toIso : yy + "-12-31";
            var r = B.ret(BENCH.series[b.key], (yy - 1) + "-12-31", to);
            return r === null ? null : r * 100;
          }) });
      });
      CHARTS.years = bars(cy, yrs.map(function (yy) {
        return yy === ASOF.getUTCFullYear() ? String(yy) + " YTD" : String(yy);
      }), sets);
    }

    /* drawdown, pool against the S&P 500 */
    var cd = document.getElementById("chartDraw");
    if (cd && BENCH.series.SP500) {
      var pg = B.poolGrowth100(MODEL, ids, periodStart(), ASOF);
      var pd = B.drawdown(pg);
      var sg = B.growth100(BENCH.series.SP500, startIso, toIso);
      var sby = {}; B.drawdown(sg).forEach(function (p) { sby[p.at] = p.v; });
      var dl = pd.map(function (p) { return p.at; });
      CHARTS.draw = line(cd, dl.map(shortMonth), [
        { label: "Pool", data: pd.map(function (p) { return p.v * 100; }),
          borderColor: INK, borderWidth: 1.6, pointRadius: 0, tension: 0, fill: false },
        { label: "S&P 500", data: dl.map(function (l) { return sby[l] === undefined ? null : sby[l] * 100; }),
          borderColor: G3, borderWidth: 1.2, borderDash: [4, 3], pointRadius: 0, tension: 0, spanGaps: true }
      ], function (v) { return v.toFixed(0) + "%"; });
    }

    /* excess return by month */
    var ce = document.getElementById("chartExcess");
    if (ce && BENCH.series.SP500) {
      var ms = P.monthSeries(MODEL, ids, periodStart(), ASOF);
      var bm = {};
      B.monthlyReturns(BENCH.series.SP500, startIso, toIso).forEach(function (r) { bm[r.at] = r.ret; });
      var ex = ms.map(function (s) {
        var b = bm[F.iso(s.to)];
        return (s.ret === null || b === undefined) ? null : (s.ret - b) * 100;
      });
      CHARTS.excess = bars(ce, ms.map(function (s) { return s.label; }),
        [{ label: "Pool less S&P 500", data: ex, borderWidth: 0,
           backgroundColor: ex.map(function (v) { return v !== null && v < 0 ? G3 : INK; }) }]);
    }
  }
  function shortMonth(at) {
    var d = F.toDate(at);
    return d ? F.mLabel(d) : at;
  }
  function baseScales(yTick) {
    var sm = small();
    return {
      x: { grid: { display: false },
           ticks: { color: G2, maxRotation: 0, autoSkip: true, maxTicksLimit: sm ? 5 : 12,
                    font: { family: SERIF, size: sm ? 9 : 11 } } },
      y: { grid: { color: G5 }, border: { display: false },
           ticks: { color: G2, font: { family: SERIF, size: sm ? 9 : 11 },
                    callback: yTick || function (v) { return v; } } }
    };
  }
  function legendOpts() {
    return { display: true, position: "bottom",
      labels: { color: G1, boxWidth: 10, boxHeight: 2, font: { family: SERIF, size: small() ? 10 : 12 } } };
  }
  function line(cv, labels, datasets, yTick) {
    return new window.Chart(cv, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: legendOpts(),
          tooltip: { backgroundColor: INK, displayColors: false,
            titleFont: { family: SERIF }, bodyFont: { family: SERIF } } },
        scales: baseScales(yTick)
      }
    });
  }
  function bars(cv, labels, datasets) {
    return new window.Chart(cv, {
      type: "bar",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: legendOpts(),
          tooltip: { backgroundColor: INK, displayColors: false,
            titleFont: { family: SERIF }, bodyFont: { family: SERIF },
            callbacks: { label: function (c) { return c.dataset.label + ": " + (c.parsed.y === null ? "n/a" : c.parsed.y.toFixed(1) + "%"); } } } },
        scales: baseScales(function (v) { return v.toFixed(0) + "%"; })
      }
    });
  }

  /* ------------------------------------------- e) contribution by account */
  function contribution(ids) {
    var rows = ids.map(function (id) {
      return { id: id, gain: P.periodChange(MODEL, [id], periodStart(), ASOF).gain };
    }).sort(function (a, b) { return b.gain - a.gain; });
    var total = rows.reduce(function (s, r) { return s + r.gain; }, 0);
    var scale = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.gain); }).concat([1]));
    var body = rows.map(function (r) {
      var w = Math.abs(r.gain) / scale * 50;             // half the track each way
      var neg = r.gain < 0;
      return "<tr><td>" + F.esc(label(r.id)) + "</td>" +
        '<td class="num"' + src(srcOf([r.id], MODEL.latest)) + ">" + F.k1(r.gain) + "</td>" +
        '<td class="bar-cell"><span class="bar-track"><i class="bar' + (neg ? " neg" : "") +
          '" style="width:' + w.toFixed(2) + "%;" + (neg ? "right:50%" : "left:50%") + '"></i></span></td></tr>';
    }).join("");
    return secHead("Contribution", "Where the " + periodLabel() + " gain came from") +
      '<div class="tw"><table class="contrib"><thead><tr><th>Account</th>' +
      '<th class="num">Investment gain</th><th>&nbsp;</th></tr></thead><tbody>' + body +
      '<tr class="total"><td>Total</td><td class="num">' + F.k1(total) + "</td><td></td></tr>" +
      "</tbody></table><caption>Figures in " + cur() + " thousands, " + periodLabel() +
      ". Bars share one scale and read from the centre line.</caption></div>";
  }

  /* ------------------------------------------------- f) capital table ---- */
  /* Accounts are listed under the heading their owner group gives them. */
  function groupsOf(ids) {
    var by = {};
    ids.forEach(function (id) {
      var g = (MODEL.accounts[id] || {}).group || "OTHER";
      (by[g] = by[g] || []).push(id);
    });
    return CFG.groupOrder.filter(function (g) { return by[g]; }).map(function (g) { return { name: g, ids: by[g] }; })
      .concat(Object.keys(by).filter(function (g) { return CFG.groupOrder.indexOf(g) < 0; })
        .map(function (g) { return { name: g, ids: by[g] }; }));
  }

  function capitalTable(ids) {
    var T = P.totals(MODEL, ASOF), r = "";
    groupsOf(ids).forEach(function (grp) {
      r += '<tr class="head-row"><td>' + F.esc(grp.name) + '</td><td class="num">' +
        F.k1(grp.ids.reduce(function (s, id) { return s + MODEL.valueAt(id, ASOF).usd; }, 0)) + "</td></tr>";
      grp.ids.forEach(function (id) {
        var v = MODEL.valueAt(id, ASOF);
        r += '<tr><td class="sub">' + F.esc(label(id)) +
          (v.at && v.at < MODEL.latest ? ' <span class="muted">as of ' + v.at + "</span>" : "") +
          '</td><td class="num"' + src(srcOf([id], v.at || "n/a")) + ">" + F.k1(v.usd) + "</td></tr>";
      });
    });
    if (MODEL.liabilitiesSheet) {
      MODEL.liabilities.filter(function (l) { return ids.indexOf(l.id) >= 0 && !l.netted; }).forEach(function (l) {
        r += "<tr><td>Less " + F.esc(label(l.id)) + " loan <span class=\"muted\">" +
          F.esc(l.ccy === "USD" ? "" : l.bal.toLocaleString("en-US") + " " + l.ccy + " at " + (1 / l.fx).toFixed(4) + ", ") +
          F.esc(l.at) + '</span></td><td class="num"' + src("Liabilities: " + l.id + ", " + l.at) + ">" +
          F.k1(-l.usd) + "</td></tr>";
      });
    } else {
      r += "<tr><td>Less loans</td><td class=\"num\">" +
        notInDb("Add a Liabilities sheet to Main DB with AccountID, Date, Balance, Currency, FXRateToUSD, Rate, Notes.") +
        "</td></tr>";
    }
    r += '<tr class="head-row"><td>L&amp;A Holdings</td><td class="num">' + F.k1(T.la) + "</td></tr>";
    MODEL.la.forEach(function (f) {
      r += '<tr><td class="sub">' + F.esc(f.name) +
        (f.deals.length ? ' <span class="muted">' + F.esc(f.deals.join(", ")) + "</span>" : "") +
        '</td><td class="num"' + src("Investment Ledger: " + f.name) + ">" + F.k1(f.value) + "</td></tr>";
    });
    r += '<tr><td class="sub">L&amp;A cash</td><td class="num"' +
      src("Distributions: L&A cash remaining") + ">" + F.k1(MODEL.laCash) + "</td></tr>";
    r += '<tr class="head-row"><td>Real estate</td><td class="num">' + F.k1(T.re) + "</td></tr>";
    r += '<tr><td class="sub">20 Vitkin Street' +
      (MODEL.vitAt ? ' <span class="muted">valued ' + F.esc(MODEL.vitAt) + "</span>" : "") +
      '</td><td class="num"' + src("20 Vitkin Street - APT #2: " + MODEL.vitAt) + ">" + F.k1(MODEL.vit) + "</td></tr>";
    MODEL.props.forEach(function (p) {
      r += '<tr><td class="sub">' + F.esc(p.name) + '</td><td class="num"' +
        src("Glaser Real Estate: " + p.name) + ">" + F.k1(p.value) + "</td></tr>";
    });
    r += '<tr class="total"><td>Under management</td><td class="num">' + F.k1(T.aum) + "</td></tr>";
    return '<div class="tw"><table><thead><tr><th>Position</th><th class="num">Value</th></tr></thead>' +
      "<tbody>" + r + "</tbody></table>" +
      "<caption>Figures in " + cur() + " thousands at " + F.esc(MODEL.latest) +
      ". Jewelry is held as a personal asset and is not in these figures." +
      (MODEL.soldProps.length ? " " + MODEL.soldProps.map(function (p) { return p.name; }).join(", ") +
        " " + (MODEL.soldProps.length === 1 ? "is" : "are") + " marked sold in Main DB and left out." : "") +
      "</caption></div>";
  }

  /* ------------------------------------------------ g) accounts table ---- */
  function accountsTable(ids) {
    var dec = lastDecember(), decY = dec.getUTCFullYear();
    var nm = CFG.returnsNotMeaningful;
    function irrCell(accs, yrs) {
      var from = decY - yrs;
      if (!accs.some(function (id) { return MODEL.started(id, new Date(Date.UTC(from, 11, 31))); })) return "n/a";
      var r = P.deckIRR(MODEL, accs, from, decY);
      return r === null ? "n/a" : F.pct(r, 1);
    }
    function row(id, i) {
      var v = MODEL.valueAt(id, ASOF);
      var m = P.periodChange(MODEL, [id], U.prevMonthEnd(ASOF), ASOF);
      var y = P.periodChange(MODEL, [id], periodStart(), ASOF);
      var skip = nm.accounts.indexOf(id) >= 0;
      function irr(yrs) { return skip ? '<span title="' + F.esc(nm.note) + '">n/m</span>' : irrCell([id], yrs); }
      return '<tr class="exp" data-i="a' + i + '"><td>' + F.esc(label(id)) +
          (v.at && v.at < MODEL.latest ? ' <span class="muted">as of ' + v.at + "</span>" : "") +
        '</td><td class="num"' + src(srcOf([id], v.at || "n/a")) + ">" + F.k1(v.usd) + "</td>" +
        '<td class="num hide-sm">' + (skip ? "n/m" : F.pct(m.ret)) + "</td>" +
        '<td class="num">' + (skip ? "n/m" : F.pct(y.ret)) + "</td>" +
        '<td class="num hide-sm">' + irr(3) + "</td>" +
        '<td class="num hide-sm">' + irr(5) + "</td>" +
        '<td class="num hide-sm">' + irr(7) + "</td></tr>" +
        '<tr class="exp-body hidden" data-body="a' + i + '"><td colspan="7"><dl class="kv">' +
          "<dt>Owner</dt><dd>" + F.esc(MODEL.accounts[id].owner || "n/a") + "</dd>" +
          "<dt>Month</dt><dd>" + (skip ? "n/m" : F.pct(m.ret)) + "</dd>" +
          "<dt>3-yr IRR</dt><dd>" + irr(3) + "</dd>" +
          "<dt>5-yr IRR</dt><dd>" + irr(5) + "</dd>" +
          "<dt>7-yr IRR</dt><dd>" + irr(7) + "</dd>" +
          "<dt>Source</dt><dd>Statements: " + F.esc(id) + ", year ends through " + decY + "</dd>" +
        "</dl></td></tr>";
    }
    var body = "", n = 0;
    groupsOf(ids).forEach(function (grp) {
      body += '<tr class="head-row"><td colspan="7">' + F.esc(grp.name) + "</td></tr>";
      grp.ids.forEach(function (id) { body += row(id, n++); });
    });
    var mAll = P.periodChange(MODEL, ids, U.prevMonthEnd(ASOF), ASOF);
    var yAll = P.periodChange(MODEL, ids, periodStart(), ASOF);
    body += '<tr class="total"><td>POOL</td>' +
      '<td class="num">' + F.k1(ids.reduce(function (s, id) { return s + MODEL.valueAt(id, ASOF).usd; }, 0)) + "</td>" +
      '<td class="num hide-sm">' + F.pct(mAll.ret) + "</td>" +
      '<td class="num">' + F.pct(yAll.ret) + "</td>" +
      '<td class="num hide-sm">' + irrCell(ids, 3) + "</td>" +
      '<td class="num hide-sm">' + irrCell(ids, 5) + "</td>" +
      '<td class="num hide-sm">' + irrCell(ids, 7) + "</td></tr>";

    return '<div class="tw"><table><thead><tr><th>Account</th><th class="num">Value</th>' +
      '<th class="num hide-sm">Month</th><th class="num">' + (S.period === "ytd" ? "YTD" : "Period") + "</th>" +
      '<th class="num hide-sm">3-yr IRR</th><th class="num hide-sm">5-yr IRR</th>' +
      '<th class="num hide-sm">7-yr IRR</th></tr></thead>' +
      "<tbody>" + body + "</tbody></table>" +
      "<caption>Money-weighted return (XIRR) on year-end statements through " + F.mLong(dec) +
      ". The start value is an outflow at the opening year end, each year's net flows sit on 30 June, " +
      "and the day count is " + U.conv("dayCount") + ". " + F.esc(nm.note) +
      " Figures in " + cur() + " thousands. Tap a row for the full detail.</caption></div>";
  }
  function lastDecember() {
    var y = ASOF.getUTCFullYear();
    return ASOF.getUTCMonth() >= 11 ? new Date(Date.UTC(y, 11, 31)) : new Date(Date.UTC(y - 1, 11, 31));
  }

  /* --------------------------------------------------- h) allocation ----- */
  function allocationSection(ids) {
    var A = P.allocation(MODEL, ids, ASOF);
    var bar = '<div class="stack" role="img" aria-label="Allocation by asset">' +
      A.lines.map(function (l, i) {
        var w = A.total ? (l.value / A.total * 100) : 0;
        return '<i style="width:' + w.toFixed(3) + "%;background:" + GREYS[i % GREYS.length] + '"' +
          ' title="' + F.esc(l.label + ": " + F.pct(l.share, 1)) + '"></i>';
      }).join("") + "</div>" +
      '<div class="stack-key">' + A.lines.map(function (l, i) {
        return '<span><i style="background:' + GREYS[i % GREYS.length] + '"></i>' +
          F.esc(l.label) + " " + F.pct(l.share, 1) + "</span>";
      }).join("") + "</div>";

    function block(title, arr) {
      return '<tr class="head-row"><td>' + title + '</td><td class="num"></td><td class="num"></td></tr>' +
        arr.map(function (l) {
          return '<tr><td class="sub">' + F.esc(l.label) + '</td>' +
            '<td class="num"' + src(l.src) + ">" + F.k1(l.value) + "</td>" +
            '<td class="num">' + F.pct(l.share, 1) + "</td></tr>";
        }).join("");
    }
    var sum = A.lines.reduce(function (s, l) { return s + (l.share || 0); }, 0);
    return secHead("Allocation", "By asset and by currency, both measured on the asset not the account") +
      bar +
      '<div class="tw"><table><thead><tr><th>Allocation</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>' +
      block("By asset", A.lines) +
      '<tr class="total"><td>Total</td><td class="num">' + F.k1(A.total) + '</td><td class="num">' +
        F.pct(sum, 1) + "</td></tr>" +
      block("By currency", A.ccy) +
      "</tbody></table>" +
      "<caption>Figures in " + cur() + " thousands at " + F.esc(MODEL.latest) +
      ". Shares use largest remainder, so the column adds to 100.0%. " +
      "FIBI *852 is Starwell's cash and is counted as cash, not as listed securities." +
      "</caption></div>";
  }

  /* ------------------------------- i) leverage and commitments ----------- */
  function leverageSection(ids) {
    var head = secHead("Leverage and commitments", "What is borrowed against the accounts, and what is still callable");
    var out = head;

    if (!MODEL.liabilitiesSheet) {
      out += '<div class="err-box soft"><b>No Liabilities sheet</b>' +
        "Main DB has no sheet named Liabilities, so no loan appears anywhere on this page, including in capital and allocation. " +
        "Add one with the columns AccountID, Date, Balance, Currency, FXRateToUSD, Rate, Notes, one row per loan per statement date. " +
        "Nothing is assumed in its place.</div>";
    } else {
      var rows = MODEL.liabilities.filter(function (l) { return ids.indexOf(l.id) >= 0; });
      if (!rows.length) {
        out += '<div class="status">No loan in Main DB belongs to an account in this view.</div>';
      } else {
        var body = rows.map(function (l) {
          var v = MODEL.valueAt(l.id, ASOF).usd;
          var gross = l.netted ? v + l.usd : v;
          var interest = l.rate === null ? null : l.usd * l.rate;
          return "<tr><td>" + F.esc(label(l.id)) +
            (l.netted ? ' <span class="muted">the statement is already net of it</span>' : "") + "</td>" +
            '<td class="num"' + src(srcOf([l.id], MODEL.latest)) + ">" + F.k1(gross) + "</td>" +
            '<td class="num"' + src("Liabilities: " + l.id + ", " + l.at) + ">" + F.k1(l.usd) + "</td>" +
            '<td class="num hide-sm">' + (gross ? F.pct(l.usd / gross, 1) : "n/a") + "</td>" +
            '<td class="num hide-sm">' + (l.rate === null ? notInDb("Add a Rate column to the Liabilities sheet.") : F.pct(l.rate, 3)) + "</td>" +
            '<td class="num hide-sm">' + (interest === null ? "n/a" : F.k1(interest)) + "</td></tr>";
        }).join("");
        var totLoan = rows.reduce(function (s, l) { return s + l.usd; }, 0);
        var totInt = rows.reduce(function (s, l) { return s + (l.rate === null ? 0 : l.usd * l.rate); }, 0);
        out += '<div class="tw"><table><thead><tr><th>Loan</th><th class="num">Gross exposure</th>' +
          '<th class="num">Balance</th><th class="num hide-sm">Of the account</th>' +
          '<th class="num hide-sm">Rate</th><th class="num hide-sm">Interest a year</th></tr></thead><tbody>' +
          body + '<tr class="total"><td>Total</td><td class="num"></td><td class="num">' + F.k1(totLoan) +
          '</td><td class="num hide-sm"></td><td class="num hide-sm"></td><td class="num hide-sm">' +
          F.k1(totInt) + "</td></tr></tbody></table>" +
          "<caption>Figures in " + cur() + " thousands. Interest a year is the balance at the rate on the row, " +
          "not an amount actually paid.</caption></div>";
      }
    }

    /* unfunded commitments */
    if (!MODEL.hasCommitment) {
      out += '<div class="err-box soft" style="margin-top:18px"><b>No Commitment column</b>' +
        "The Investment Ledger has no Commitment column, so what is still callable cannot be shown. " +
        "Add one holding each fund's total commitment, and the unfunded balance follows from Amount Invested.</div>";
    } else {
      var fs = MODEL.la.filter(function (f) { return f.commitment !== null; });
      if (!fs.length) {
        out += '<div class="status" style="margin-top:18px">No fund on the Investment Ledger carries a commitment.</div>';
      } else {
        out += '<div class="tw" style="margin-top:18px"><table><thead><tr><th>Fund</th>' +
          '<th class="num">Committed</th><th class="num">Called</th><th class="num">Unfunded</th></tr></thead><tbody>' +
          fs.map(function (f) {
            return "<tr><td>" + F.esc(f.name) + "</td>" +
              '<td class="num"' + src("Investment Ledger: " + f.name + ", Commitment") + ">" + F.k1(f.commitment) + "</td>" +
              '<td class="num">' + F.k1(f.invested) + "</td>" +
              '<td class="num">' + F.k1(f.unfunded) + "</td></tr>";
          }).join("") +
          '<tr class="total"><td>Total</td><td class="num">' +
            F.k1(fs.reduce(function (s, f) { return s + f.commitment; }, 0)) + '</td><td class="num">' +
            F.k1(fs.reduce(function (s, f) { return s + f.invested; }, 0)) + '</td><td class="num">' +
            F.k1(fs.reduce(function (s, f) { return s + f.unfunded; }, 0)) + "</td></tr>" +
          "</tbody></table><caption>Figures in " + cur() + " thousands, Amit's share as the ledger records it.</caption></div>";
      }
    }
    return out;
  }

  /* ----------------------------------------------- j) private funds ------ */
  function fundsSection() {
    var body = MODEL.la.map(function (f) {
      return "<tr><td>" + F.esc(f.name) +
        (f.deals.length ? '<div class="muted">' + F.esc(f.deals.join(", ")) + "</div>" : "") + "</td>" +
        '<td class="hide-sm">' + F.esc(f.type) + "</td>" +
        '<td class="num">' + (f.commitment === null ? notInDb("Add a Commitment column to the Investment Ledger.") : F.k1(f.commitment)) + "</td>" +
        '<td class="num"' + src("Investment Ledger: " + f.name + ", Amount Invested") + ">" + F.k1(f.invested) + "</td>" +
        '<td class="num hide-sm"' + src("Distributions: " + f.name) + ">" + F.k1(f.roc + f.income) + "</td>" +
        '<td class="num">' + F.k1(f.value) + "</td>" +
        '<td class="num hide-sm">' + (f.dpi === null ? "n/a" : f.dpi.toFixed(2) + "x") + "</td></tr>";
    }).join("");
    var tot = MODEL.la.reduce(function (a, f) {
      a.inv += f.invested; a.dist += f.roc + f.income; a.val += f.value; return a;
    }, { inv: 0, dist: 0, val: 0 });
    return secHead("Private funds", "Through L&A Holdings, at Amit's share") +
      '<div class="tw"><table><thead><tr><th>Fund</th><th class="hide-sm">Strategy</th>' +
      '<th class="num">Committed</th><th class="num">Called</th>' +
      '<th class="num hide-sm">Distributions</th><th class="num">Carrying value</th>' +
      '<th class="num hide-sm">DPI</th></tr></thead><tbody>' + body +
      '<tr class="total"><td>Total</td><td class="hide-sm"></td><td class="num"></td>' +
      '<td class="num">' + F.k1(tot.inv) + '</td><td class="num hide-sm">' + F.k1(tot.dist) +
      '</td><td class="num">' + F.k1(tot.val) + '</td><td class="num hide-sm">' +
      (tot.inv ? (tot.dist / tot.inv).toFixed(2) + "x" : "n/a") + "</td></tr></tbody></table>" +
      "<caption>Figures in " + cur() + " thousands. Carrying value is the ledger's current value less capital " +
      "returned. DPI is distributions, both income and return of capital, over capital called. " +
      "L&amp;A cash of " + F.k1(MODEL.laCash) + " sits outside the funds and is shown under Capital.</caption></div>";
  }

  /* ---------------------------------------------- k) real estate chart --- */
  function realEstateSection() {
    if (!MODEL.vitHistory.length) return "";
    return secHead("20 Vitkin Street", "Valuation history, in shekels and in dollars") +
      '<div class="chart-wrap"><canvas id="chartVitkin"></canvas></div>' +
      '<div class="cap">Shekel value on the left, dollar value on the right. ' +
      "The two part company as the rate moves. Latest valuation " + F.esc(MODEL.vitAt) +
      (MODEL.vitFx ? " at " + MODEL.vitFx.toFixed(4) + " shekels to the dollar" : "") + ".</div>";
  }
  function drawVitkin() {
    var cv = document.getElementById("chartVitkin");
    if (!cv || !window.Chart || !MODEL.vitHistory.length) return;
    var h = MODEL.vitHistory;
    CHARTS.vitkin = new window.Chart(cv, {
      data: {
        labels: h.map(function (r) { return r.at; }),
        datasets: [
          { type: "line", label: "Value, shekels", yAxisID: "y", data: h.map(function (r) { return r.ils; }),
            borderColor: INK, borderWidth: 1.8, pointRadius: 2, tension: 0 },
          { type: "line", label: "Value, dollars", yAxisID: "y1", data: h.map(function (r) { return r.usd; }),
            borderColor: G3, borderWidth: 1.4, borderDash: [4, 3], pointRadius: 2, tension: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: legendOpts(),
          tooltip: { backgroundColor: INK, displayColors: false,
            titleFont: { family: SERIF }, bodyFont: { family: SERIF },
            callbacks: { label: function (c) {
              var m = c.datasetIndex === 0 ? "₪" : "$";
              return c.dataset.label + ": " + m + (Math.abs(c.parsed.y) / 1e6).toFixed(2) + "M";
            } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: G2, maxRotation: 0, autoSkip: true,
               maxTicksLimit: small() ? 4 : 10, font: { family: SERIF, size: small() ? 9 : 11 } } },
          y: { grid: { color: G5 }, border: { display: false },
               ticks: { color: G2, font: { family: SERIF, size: small() ? 9 : 11 },
                        callback: function (v) { return "₪" + (v / 1e6).toFixed(1) + "M"; } } },
          y1: { position: "right", grid: { display: false }, border: { display: false },
                ticks: { color: G2, font: { family: SERIF, size: small() ? 9 : 11 },
                         callback: function (v) { return "$" + (v / 1e6).toFixed(1) + "M"; } } }
        }
      }
    });
  }

  /* -------------------------------------------------- l) quarter close --- */
  function quarterOf(d) {
    return d.getUTCFullYear() + "Q" + (Math.floor(d.getUTCMonth() / 3) + 1);
  }
  function quarterClose(ids) {
    var T = P.totals(MODEL, ASOF);
    var q = quarterOf(ASOF);
    var prior = SNAPS.filter(function (s) { return s.as_of < F.iso(ASOF); })
                     .sort(function (a, b) { return a.as_of < b.as_of ? 1 : -1; })[0];
    var deltaRow = "";
    if (prior) {
      var d = T.aum - Number(prior.payload.aum || 0);
      deltaRow = '<dt>Change since ' + F.esc(prior.quarter) + " (" + F.esc(prior.as_of) + ")</dt><dd>" +
        F.bigSigned(d) + "</dd>";
    } else {
      deltaRow = "<dt>Change since the last frozen quarter</dt><dd>No quarter has been frozen yet.</dd>";
    }
    var already = SNAPS.some(function (s) { return s.quarter === q; });
    return secHead("Quarter close", "Freeze the figures as they stand, and compare with the last freeze") +
      '<dl class="kv wide">' +
        "<dt>Reporting date</dt><dd>" + F.esc(MODEL.latest) + "</dd>" +
        "<dt>Quarter</dt><dd>" + F.esc(q) + (already ? " (already frozen)" : "") + "</dd>" +
        "<dt>Under management</dt><dd>" + F.big(T.aum) + "</dd>" +
        deltaRow +
      "</dl>" +
      '<div class="btn-row">' +
        '<button class="btn sm" id="btnFreeze"' + (already || !SB ? " disabled" : "") + ">Freeze quarter</button>" +
        '<button class="btn ghost sm" id="btnPdf">Download PDF</button>' +
        '<button class="btn ghost sm" id="btnCsv">Export CSV</button>' +
      "</div>" +
      '<div class="status" id="freezeNote">' +
        (SB ? "A freeze stores the figures as computed now. It is a record and is never edited from this page."
            : "Freezing needs a signed-in session.") + "</div>";
  }

  /* --------------------------------- m) data checks and coverage grid ---- */
  function coverageGrid(ids) {
    var from = new Date(Date.UTC(ASOF.getUTCFullYear() - 1, 0, 31));
    var C = P.coverage(MODEL, ids, F.iso(from));
    var head = C.months.map(function (m) {
      var d = F.toDate(m);
      return '<th class="cov-h"><span>' + F.esc(F.mLabel(d)) + "</span></th>";
    }).join("");
    var body = C.rows.map(function (r) {
      var late = r.behind !== null && r.behind > C.staleDays;
      return "<tr><td>" + F.esc(r.label) + (late ? ' <span class="muted">' + r.behind + " days behind</span>" : "") + "</td>" +
        r.cells.map(function (c, i) {
          var t = c === "yes" ? "■" : c === "no" ? "×" : "·";
          var title = C.months[i] + ": " + (c === "yes" ? "statement in Main DB" :
            c === "no" ? "no statement" : c === "pre" ? "account not open" : "stopped reporting");
          return '<td class="cov cov-' + c + '" title="' + F.esc(title) + '">' + t + "</td>";
        }).join("") + "</tr>";
    }).join("");
    return '<div class="tw cov-wrap"><table class="cov-t"><thead><tr><th>Account</th>' + head +
      "</tr></thead><tbody>" + body + "</tbody></table>" +
      "<caption>A filled square is a statement in Main DB, a cross is a month with none, a dot is a month " +
      "before the account opened or after it stopped reporting. An account is flagged once it is more than " +
      C.staleDays + " days behind.</caption></div>";
  }

  function dataChecks(ids, series) {
    var c = MODEL.checks, items = [];
    c.missing.forEach(function (m) { items.push("Not in Main DB · " + m); });
    c.dupes.forEach(function (d) { items.push("Duplicate statement · " + d); });
    ids.forEach(function (id) {
      var v = MODEL.valueAt(id, ASOF);
      if (v.at && v.at < MODEL.latest) items.push("Stale · " + label(id) + " latest statement " + v.at + ", carried forward");
    });
    series.forEach(function (s) { if (s.merged) items.push("Missing month · " + s.long + " reported as one period"); });
    c.notes.slice(0, 12).forEach(function (n) { items.push("Note to settle · " + n); });
    return '<details class="checks"><summary>Data checks (' + items.length + ")</summary><ul>" +
      items.map(function (i) { return "<li>" + F.esc(i) + "</li>"; }).join("") + "</ul>" +
      '<div style="margin-top:18px">' + coverageGrid(ids) + "</div></details>";
  }

  /* ------------------------------------- n) conventions and settings ----- */
  function conventionsPanel() {
    function row(k, v, l) {
      return "<tr><td>" + F.esc(l) + '</td><td class="num">' + F.esc(v) + "</td></tr>";
    }
    var rows = CFG.conventions.map(function (c) {
      var v = c.key === "planningReturn" ? F.pct(c.value, 0)
            : c.key === "irrFlowMonth" ? "30 June"
            : c.value + " " + c.unit;
      return row(c.key, v, c.label);
    }).concat(CFG.thresholds.map(function (t) {
      var v = t.unit.indexOf("of the") === 0 || t.unit.indexOf("of listed") === 0 ? F.pct(t.value, 0) : t.value + " " + t.unit;
      return row(t.key, v, t.label);
    })).join("");
    return '<details class="checks"><summary>Conventions and settings</summary>' +
      '<div class="tw"><table><thead><tr><th>Setting</th><th class="num">Value</th></tr></thead><tbody>' +
      rows + "</tbody></table>" +
      "<caption>These are the only values the portal holds. Every figure on the page is computed " +
      "from Main DB at the moment it is drawn.</caption></div>" +
      '<div class="status" style="margin-top:12px">Account labels and groupings come from a DisplayName column ' +
      "on the Accounts sheet where there is one, and from the settings file where there is not.</div></details>";
  }

  /* ------------------------------------------------------------ CSV ----- */
  function csv(series) {
    var head = ["Month", "Start", "Additions", "Withdrawals", "Investment gain", "Cumulative gain", "Return %", "End"];
    var lines = [head.join(",")];
    series.forEach(function (s) {
      lines.push([s.label, s.start.toFixed(2), s.add.toFixed(2), s.wd.toFixed(2),
                  s.gain.toFixed(2), s.cum.toFixed(2),
                  s.ret === null ? "" : (s.ret * 100).toFixed(2), s.end.toFixed(2)]
        .map(function (v) { return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "starwell-monthly-" + MODEL.latest + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ----------------------------------------------------------- render --- */
  function poolAccounts() { return P.scopeAccounts(MODEL); }
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
    destroyCharts();
    ensurePick();
    S.fxRate = MODEL.fx ? MODEL.fx.rate : null;
    if (S.ccy === "ILS" && !S.fxRate) S.ccy = "USD";

    var list = poolAccounts();
    var sIds = seriesIds();
    var series = P.monthSeries(MODEL, sIds, periodStart(), ASOF);
    var sLabel = S.group === "pool" ? "the whole pool" : S.group === "owner" ? S.pick : label(S.pick);

    root.innerHTML =
      alertStrip(list) +
      selectors() +
      '<div class="sec">' + figures(list) + "</div>" +
      '<div class="sec">' + secHead("Monthly change", "Investment gain, net flows and the running total for " + sLabel) +
        breakdownRow() +
        '<div class="seg narrow" id="segLine" style="margin-top:14px">' +
          '<button type="button" data-line="gain"' + (S.chartLine === "gain" ? ' class="on"' : "") + ">Cumulative gain</button>" +
          '<button type="button" data-line="value"' + (S.chartLine === "value" ? ' class="on"' : "") + ">Month-end value</button>" +
        "</div>" +
        '<div class="chart-wrap"><canvas id="chartMonthly"></canvas></div>' + monthlyLegend() +
        '<div style="margin-top:18px">' + monthlyTable(series) + "</div>" +
      "</div>" +
      '<div class="sec">' + marketsSection(list) + "</div>" +
      '<div class="sec">' + contribution(list) + "</div>" +
      '<div class="sec">' + secHead("Capital", "Accounts, L&A Holdings and real estate") + capitalTable(list) + "</div>" +
      '<div class="sec">' + secHead("Accounts", "Value and money-weighted return") + accountsTable(list) + "</div>" +
      '<div class="sec">' + allocationSection(list) + "</div>" +
      '<div class="sec">' + leverageSection(list) + "</div>" +
      '<div class="sec">' + fundsSection() + "</div>" +
      '<div class="sec">' + realEstateSection() + "</div>" +
      '<div class="sec">' + quarterClose(list) + "</div>" +
      '<div class="sec">' + dataChecks(list, series) + conventionsPanel() + "</div>";

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
    var draw = function () { drawMonthly(series); drawMarkets(list); drawVitkin(); };
    if ("requestIdleCallback" in window) window.requestIdleCallback(draw);
    else setTimeout(draw, 0);

    root.querySelectorAll("tr.exp").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var b = root.querySelector('[data-body="' + tr.getAttribute("data-i") + '"]');
        if (b) b.classList.toggle("hidden");
      });
    });
    on("btnCsv", "click", function () { csv(series); });
    on("btnPdf", "click", function () { window.print(); });
    on("btnFreeze", "click", function () { freeze(list); });
    ["selScope", "selPeriod", "selGroup"].forEach(function (id) {
      on(id, "change", function (e) {
        var key = id === "selScope" ? "scope" : id === "selPeriod" ? "period" : "group";
        S[key] = e.target.value;
        if (key === "group") S.pick = null;
        paint();
      });
    });
    on("selAsAt", "change", function (e) { S.asAt = e.target.value || null; applyAsAt(); });
    on("segCcy", "click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      S.ccy = b.getAttribute("data-ccy"); paint();
    });
    on("segLine", "click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      S.chartLine = b.getAttribute("data-line"); paint();
    });
    on("benchChips", "click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = b.getAttribute("data-bench"), i = S.bench.indexOf(k);
      if (i >= 0) { if (S.bench.length > 1) S.bench.splice(i, 1); } else S.bench.push(k);
      paint();
    });
  }
  function on(id, ev, fn) { var e = document.getElementById(id); if (e) e.addEventListener(ev, fn); }

  function applyAsAt() {
    ASOF = F.toDate(S.asAt || MODEL.latest);
    paint();
  }

  function freeze(ids) {
    var note = document.getElementById("freezeNote");
    if (!SB) { if (note) note.textContent = "Freezing needs a signed-in session."; return; }
    var T = P.totals(MODEL, ids ? ASOF : ASOF);
    var y = P.periodChange(MODEL, ids, periodStart(), ASOF);
    var payload = {
      aum: T.aum, capital: T.capital, accounts: T.accounts, la: T.la, re: T.re,
      loan: T.loan, periodGain: y.gain, periodReturn: y.ret,
      allocation: P.allocation(MODEL, ids, ASOF),
      readAt: DB.readAt.toISOString()
    };
    if (note) note.textContent = "Freezing…";
    SB.from(CFG.snapshotTable).insert({
      quarter: quarterOf(ASOF), as_of: F.iso(ASOF), payload: payload, frozen_by: (WHO || "").toLowerCase()
    }).then(function (res) {
      if (res.error) { if (note) note.textContent = "Could not freeze: " + res.error.message; return; }
      loadSnaps().then(paint);
    });
  }
  function loadSnaps() {
    if (!SB) return Promise.resolve();
    return SB.from(CFG.snapshotTable).select("quarter,as_of,payload,frozen_at").order("as_of", { ascending: false })
      .then(function (res) { SNAPS = (res.error || !res.data) ? [] : res.data; })
      .catch(function () { SNAPS = []; });
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

  function mount(sb, who) {
    SB = sb || null; WHO = who || "";
    skeleton();
    ASOF = null;
    P.readMainDB().then(function (db) {
      DB = db;
      MODEL = P.build(db);
      if (!MODEL.latest) throw new Error("Main DB returned no statement rows.");
      ASOF = F.toDate(MODEL.latest);
      if (window.console && console.info) console.info("Main DB: " + db.log.join(" | "));
      return Promise.all([
        loadSnaps(),
        B ? B.load(MODEL, SB).then(function (p) { BENCH = p; BENCH_TRIED = true; }) : null
      ]);
    }).then(function () {
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
  P._paint = paint;
})();
