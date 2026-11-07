/* Starwell Portal — benchmark comparison.

   The browser never calls a market data API. Index levels come from one of
   two places, in this order:

     1. a "Benchmarks" sheet in Main DB (Month, Benchmark, TotalReturnIndex),
        which overrides everything else;
     2. the benchmarks table in Supabase, filled on a schedule by the Edge
        Function in supabase/functions/benchmarks, which holds the provider
        API key as a secret.

   When neither is there the section says so and shows nothing. It never
   invents a level and never reaches out to a provider from the page.

   The pool is compared on a time-weighted return, never on XIRR. A
   money-weighted return measures the timing of the family's own deposits,
   which an index has none of, so the two are not comparable. */

window.StarwellBenchmarks = (function () {
  "use strict";

  var P = window.StarwellPortal;
  var CFG = window.STARWELL_SETTINGS;
  var F = P.fmt, U = P.util;
  var DAY_COUNT = U.conv("dayCount");
  var IRR_FLOW_MONTH = U.conv("irrFlowMonth");

  function iso(d) { return P.fmt.iso(d); }
  function monthEnd(d) { return U.monthEnd(d); }

  /* ------------------------------------------------------------- load --- */
  function fromSheet(M) {
    if (!M.benchSheet) return null;
    var keys = Object.keys(M.benchSheet);
    if (!keys.length) return null;
    var series = {}, through = null;
    keys.forEach(function (k) {
      series[k] = M.benchSheet[k].map(function (r) { return { at: r.at, level: r.level }; });
      var last = series[k][series[k].length - 1];
      if (last && (!through || last.at > through)) through = last.at;
    });
    return { series: series, through: through, source: "the Benchmarks sheet in Main DB" };
  }

  function fromSupabase(sb) {
    if (!sb) return Promise.resolve(null);
    return sb.from(CFG.benchmarkTable)
      .select("month,benchmark,total_return_index,provider")
      .order("month", { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        var series = {}, through = null, provider = null;
        res.data.forEach(function (r) {
          var d = F.toDate(r.month);
          if (!d) return;
          var at = iso(monthEnd(d));
          series[r.benchmark] = series[r.benchmark] || [];
          series[r.benchmark].push({ at: at, level: Number(r.total_return_index) });
          if (!through || at > through) through = at;
          provider = provider || r.provider;
        });
        if (!Object.keys(series).length) return null;
        Object.keys(series).forEach(function (k) {
          series[k].sort(function (a, b) { return a.at < b.at ? -1 : 1; });
        });
        return { series: series, through: through, source: provider || "the scheduled market data job" };
      })
      .catch(function () { return null; });
  }

  /* Blends and currency conversions are built here, from component series,
     so the stored feed only ever holds what a provider actually quotes. */
  function derive(pack) {
    if (!pack) return pack;
    var s = pack.series;

    /* TA-125 is quoted in shekels. Convert it to dollars month by month at
       the rate stored beside it, and label it a price return. */
    if (s.TA125 && s.USDILS) {
      /* The rate used for a month is the latest one at or before that month
         end, so a month the rate feed happens to be missing does not drop a
         month of the index. */
      var conv = [], fi = 0, fx = null;
      s.TA125.forEach(function (r) {
        while (fi < s.USDILS.length && s.USDILS[fi].at <= r.at) { fx = s.USDILS[fi].level; fi++; }
        if (fx) conv.push({ at: r.at, level: r.level / fx });
      });
      if (conv.length) s.TA125 = conv;
      else delete s.TA125;
    } else if (s.TA125 && !s.USDILS) {
      delete s.TA125;      // never show it in shekels beside dollar series
    }

    CFG.benchmarks.forEach(function (b) {
      if (!b.blend) return;
      var parts = b.blend.filter(function (p) { return s[p.key] && s[p.key].length; });
      if (parts.length !== b.blend.length) return;
      /* common months only, so a blend never extends past its components */
      var maps = b.blend.map(function (p) {
        var m = {}; s[p.key].forEach(function (r) { m[r.at] = r.level; }); return m;
      });
      var months = s[b.blend[0].key].map(function (r) { return r.at; })
        .filter(function (at) { return maps.every(function (m) { return m[at] !== undefined; }); });
      if (months.length < 2) return;
      /* rebalanced monthly: each month's return is the weighted average of
         the components' returns, then the levels are chained */
      var out = [{ at: months[0], level: 100 }], lvl = 100;
      for (var i = 1; i < months.length; i++) {
        var r = 0;
        for (var j = 0; j < b.blend.length; j++) {
          r += b.blend[j].w * (maps[j][months[i]] / maps[j][months[i - 1]] - 1);
        }
        lvl = lvl * (1 + r);
        out.push({ at: months[i], level: lvl });
      }
      s[b.key] = out;
    });
    return pack;
  }

  function load(M, sb) {
    var sheet = fromSheet(M);
    if (sheet) return Promise.resolve(derive(sheet));
    return fromSupabase(sb).then(function (p) { return derive(p); });
  }

  /* ---------------------------------------------------------- measure --- */
  function levelAt(series, at) {
    var best = null;
    for (var i = 0; i < series.length; i++) {
      if (series[i].at <= at) best = series[i]; else break;
    }
    return best;
  }
  function ret(series, fromIso, toIso) {
    if (!series || !series.length) return null;
    var a = levelAt(series, fromIso), b = levelAt(series, toIso);
    if (!a || !b || !a.level || a.at === b.at) return null;
    return b.level / a.level - 1;
  }
  function annRet(series, fromIso, toIso) {
    var r = ret(series, fromIso, toIso);
    if (r === null) return null;
    return P.annualise(r, F.toDate(fromIso), F.toDate(toIso));
  }
  function calendarYear(series, y) {
    return ret(series, y - 1 + "-12-31", y + "-12-31");
  }
  function monthlyReturns(series, fromIso, toIso) {
    if (!series) return [];
    var out = [], prev = null;
    series.forEach(function (r) {
      if (r.at < fromIso || r.at > toIso) { if (r.at <= fromIso) prev = r; return; }
      if (prev && prev.level) out.push({ at: r.at, ret: r.level / prev.level - 1 });
      prev = r;
    });
    return out;
  }
  function growth100(series, fromIso, toIso) {
    if (!series) return [];
    var base = levelAt(series, fromIso);
    if (!base || !base.level) return [];
    return series.filter(function (r) { return r.at >= base.at && r.at <= toIso; })
      .map(function (r) { return { at: r.at, v: 100 * r.level / base.level }; });
  }
  function drawdown(points) {    /* points are {at, v} */
    var peak = -Infinity;
    return points.map(function (p) {
      if (p.v > peak) peak = p.v;
      return { at: p.at, v: peak ? p.v / peak - 1 : 0 };
    });
  }

  /* ------------------------------------------------- the pool's own TWR -- */
  /* Monthly statements only start once Main DB has one for every reporting
     account in a month. Before that the pool is measured on calendar years:
     an annual Modified Dietz with the year's net flows placed mid-year. The
     two are chained, and the method used is reported alongside. */
  function annualDietz(M, ids, from, to) {
    var span = U.days(from, to) || 1, gain = 0;
    var base = ids.reduce(function (s, id) { return s + (M.started(id, from) ? M.valueAt(id, from).usd : 0); }, 0);
    var wflow = 0;
    ids.forEach(function (id) {
      var v1 = M.valueAt(id, to).usd;
      var v0 = M.started(id, from) ? M.valueAt(id, from).usd : 0;
      var f = 0;
      M.flowsIn(id, from, to).forEach(function (fl) { f += fl.net; });
      gain += (v1 - v0) - f;
      if (f) {
        var mid = new Date(Date.UTC(to.getUTCFullYear(), IRR_FLOW_MONTH - 1, 30));
        if (mid < from) mid = from;
        if (mid > to) mid = to;
        wflow += f * (U.days(mid, to) / span);
      }
    });
    return (base + wflow) ? gain / (base + wflow) : null;
  }

  /* Monthly chaining is available when Main DB has month-end statements
     across the whole window. A month that merged into the next because one
     account was missing is chained as it stands; a period that spans a
     quarter or more means the workbook only holds year ends there, and the
     window falls back to calendar years. */
  var MAX_SPAN_MONTHS = 3;
  function fullyMonthly(M, ids, from, to) {
    var series = P.monthSeries(M, ids, from, to);
    if (series.length < 1) return false;
    if (iso(series[0].from) !== iso(from)) return false;
    if (iso(series[series.length - 1].to) !== iso(to)) return false;
    return series.every(function (s) {
      var n = (s.to.getUTCFullYear() - s.from.getUTCFullYear()) * 12 +
              (s.to.getUTCMonth() - s.from.getUTCMonth());
      return n <= MAX_SPAN_MONTHS;
    });
  }

  /* Returns { ret, ann, method, parts } over [from, to]. */
  function poolTWR(M, ids, from, to) {
    var cuts = [from], y;
    for (y = from.getUTCFullYear() + 1; y <= to.getUTCFullYear(); y++) {
      var dec = new Date(Date.UTC(y - 1, 11, 31));
      if (dec > from && dec < to) cuts.push(dec);
    }
    cuts.push(to);
    var g = 1, parts = [], anyMonthly = false, anyAnnual = false, ok = false;
    for (var i = 1; i < cuts.length; i++) {
      var a = cuts[i - 1], b = cuts[i], r, how;
      if (fullyMonthly(M, ids, a, b)) {
        r = P.timeWeighted(P.monthSeries(M, ids, a, b)); how = "monthly"; anyMonthly = true;
      } else {
        r = annualDietz(M, ids, a, b); how = "calendar year"; anyAnnual = true;
      }
      if (r === null) continue;
      ok = true;
      g *= (1 + r);
      parts.push({ from: iso(a), to: iso(b), ret: r, how: how });
    }
    if (!ok) return { ret: null, ann: null, method: "none", parts: [] };
    var total = g - 1;
    return {
      ret: total,
      ann: P.annualise(total, from, to),
      method: anyMonthly && anyAnnual ? "monthly where Main DB has a statement for every account, calendar year before that"
            : anyMonthly ? "monthly" : "calendar year",
      parts: parts
    };
  }

  /* Growth of $100 for the pool, month by month, from the chained returns. */
  function poolGrowth100(M, ids, from, to) {
    var series = P.monthSeries(M, ids, from, to);
    var out = [{ at: iso(from), v: 100 }], lvl = 100;
    series.forEach(function (s) {
      if (s.ret === null || !isFinite(s.ret)) return;
      lvl = lvl * (1 + s.ret);
      out.push({ at: iso(s.to), v: lvl });
    });
    return out;
  }

  return {
    load: load, ret: ret, annRet: annRet, calendarYear: calendarYear,
    monthlyReturns: monthlyReturns, growth100: growth100, drawdown: drawdown,
    levelAt: levelAt, poolTWR: poolTWR, poolGrowth100: poolGrowth100,
    annualDietz: annualDietz, fullyMonthly: fullyMonthly
  };
})();
