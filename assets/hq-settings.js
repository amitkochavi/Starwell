/* Starwell Portal — settings.

   The only constants the portal is allowed to hold. Everything that is a
   figure (a balance, a flow, a return, a loan, a commitment, an FX rate, a
   reporting date) is read from Main DB at run time and is never typed here.

   What lives here is limited to:
     a) conventions, which are method and not data;
     b) thresholds that decide when to raise an alert;
     c) labels and grouping, which are presentation;
     d) the Main DB location and the benchmark tickers.

   Every value below is shown to the reader in the "Conventions and settings"
   panel at the foot of the Dashboard, so nothing here is a hidden assumption.

   SECURITY, to be fixed the week of 9 Nov 2026: the workbook is read straight
   from the browser, so its published URL has to sit in this file, and this
   repository is public. Anyone who finds the URL can read the whole balance
   sheet without signing in. The replacement is a server-side function holding
   the URL in an environment variable and checking the caller's Supabase
   session; when that lands, mainDbPubUrl goes away and fetchTab() calls the
   function instead. Until then, treat the URL as a published secret. */

window.STARWELL_SETTINGS = (function () {
  "use strict";

  return {
    mainDbPubUrl:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBX6lzMmMK7jnnNaW1ZF3VGG0yR9v7k8P3nx1uAQ9gI3a7_pvluZchUMIkhyM9woPiuauCSP2Akmf5",

    /* ---- conventions (method, not data) ------------------------------- */
    conventions: [
      { key: "flowLagDays", value: 15, unit: "days",
        label: "Flows are dated this many days before the statement they appear on",
        why: "Statements report a month's additions and withdrawals in one line without dates. Mid-month is the least wrong assumption." },
      { key: "dayCount", value: 365.25, unit: "days per year",
        label: "Day count used to annualise money-weighted returns",
        why: "Matches the convention behind the quarterly deck." },
      { key: "irrFlowMonth", value: 6, unit: "month of the year",
        label: "Annual IRR flows are placed on 30 June of their calendar year",
        why: "Matches the convention behind the quarterly deck." },
      { key: "planningReturn", value: 0.09, unit: "a year",
        label: "Planning assumption used for forward illustrations",
        why: "A planning figure only. It is never mixed into a reported return." }
    ],

    /* ---- thresholds that raise an alert ------------------------------- */
    thresholds: [
      { key: "staleDays", value: 45, unit: "days",
        label: "An account is flagged when its latest statement is older than this" },
      { key: "marginLimit", value: 0.25, unit: "of the account value",
        label: "A margin loan is flagged when it passes this share of the account it sits in" },
      { key: "concentrationLimit", value: 0.10, unit: "of listed holdings",
        label: "A single holding is flagged when it passes this share of listed holdings" },
      { key: "openingFlowRatio", value: 0.5, unit: "of the opening value",
        label: "An account's first statement is read as carrying an unrecorded transfer in when its Additions fall below this share of the opening balance",
        why: "Main DB does not always record the transfer that opens an account. Without this the whole opening balance would read as investment gain in the period the account first appears." }
    ],

    /* ---- labels and grouping (presentation) ---------------------------- */
    /* A "DisplayName" column on the Accounts sheet overrides anything here.
       group is the heading an account is listed under.
       assetClass places the account in the allocation table: "listed" for
       listed securities, "cash" for a deposit or settlement balance. */
    accounts: {
      SCHWAB_0687:  { label: "Schwab *0687 · Glaser Irrev Trust",       group: "AMIT",     assetClass: "listed" },
      CNB_48101310: { label: "City National *5020 (was *1310)",          group: "AMIT",     assetClass: "listed" },
      FIBI_314390:  { label: "FIBI *4390 (ILS)",                         group: "AMIT",     assetClass: "listed" },
      FIBI_852:     { label: "FIBI *852 · Starwell (ILS)",               group: "STARWELL", assetClass: "cash"   },
      SCHWAB_1558:  { label: "Schwab *1558 · Tamar Rev Trust",           group: "TAMAR",    assetClass: "listed" },
      CNB_48492010: { label: "City National *2010 · Tamar Rev Trust",    group: "TAMAR",    assetClass: "listed" },
      CNB_48784990: { label: "City National *4990 · Tamar GST Trust",    group: "TAMAR",    assetClass: "listed" }
    },
    groupOrder: ["AMIT", "TAMAR", "STARWELL", "OTHER"],

    /* The accounts the Starwell view covers. Family adds everything else
       that reports in Main DB. */
    starwell: ["SCHWAB_0687", "CNB_48101310", "FIBI_314390", "FIBI_852",
               "SCHWAB_1558", "CNB_48492010", "CNB_48784990"],

    /* Accounts whose deposits, withdrawals and loan activity are not fully
       recorded in Main DB, so a per account return would overstate. The note
       is shown wherever their return would otherwise appear. */
    returnsNotMeaningful: {
      accounts: ["FIBI_314390", "FIBI_852"],
      note: "n/m: FIBI deposits, withdrawals and loan activity are not fully recorded in Main DB, so account returns would overstate."
    },

    /* ---- benchmarks ---------------------------------------------------- */
    /* Series are read from a "Benchmarks" sheet in Main DB when one exists,
       otherwise from the benchmarks table the scheduled server-side job
       fills. The browser never calls a market data API. */
    benchmarks: [
      { key: "SP500",  name: "S&P 500",        ticker: "SPY",  kind: "total return, ETF proxy" },
      { key: "NDX",    name: "Nasdaq-100",     ticker: "QQQ",  kind: "total return, ETF proxy" },
      { key: "ACWI",   name: "MSCI ACWI",      ticker: "ACWI", kind: "total return, ETF proxy" },
      { key: "AGG",    name: "US agg bonds",   ticker: "AGG",  kind: "total return, ETF proxy", hidden: true },
      { key: "G6040",  name: "Global 60/40",   ticker: null,   kind: "60% ACWI, 40% AGG, rebalanced monthly",
        blend: [{ key: "ACWI", w: 0.6 }, { key: "AGG", w: 0.4 }] },
      { key: "TA125",  name: "TA-125",         ticker: "TA125", kind: "price return, in USD" }
    ],
    benchmarkTable: "benchmarks",   // Supabase table the scheduled job writes

    /* ---- quarter close -------------------------------------------------- */
    snapshotTable: "portal_snapshots"
  };
})();
