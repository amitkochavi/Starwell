// Starwell Portal — scheduled benchmark refresh.
//
// Runs on a schedule in Supabase, not in the browser. It holds the market
// data credentials as secrets, fetches monthly total return levels for the
// benchmark proxies, and upserts them into the `benchmarks` table that the
// Dashboard reads through the signed-in Supabase client. The page itself
// never calls a market data provider, so no key is ever shipped to a client.
//
// Deploy:
//   supabase secrets set MARKET_DATA_PROVIDER=yahoo
//   supabase functions deploy benchmarks --no-verify-jwt
//   # then schedule it, e.g. daily at 06:20 UTC:
//   select cron.schedule(
//     'benchmarks-refresh', '20 6 * * *',
//     $$ select net.http_post(
//          url := '<project-url>/functions/v1/benchmarks',
//          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
//        ) $$);
//
// A provider that needs a key reads it from Deno.env.get("MARKET_DATA_KEY").
// The default provider needs none.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SERIES: Array<{ key: string; symbol: string }> = [
  { key: "SP500", symbol: "SPY" },
  { key: "NDX", symbol: "QQQ" },
  { key: "ACWI", symbol: "ACWI" },
  { key: "AGG", symbol: "AGG" },
  { key: "TA125", symbol: "^TA125.TA" },
  { key: "USDILS", symbol: "ILS=X" },
];

const START = Date.UTC(2017, 0, 1) / 1000;

function monthEndISO(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return new Date(next - 86400000).toISOString().slice(0, 10);
}

async function monthly(symbol: string): Promise<Array<[string, number]>> {
  const now = Math.floor(Date.now() / 1000) + 86400;
  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${START}&period2=${now}&interval=1mo&events=div`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r) throw new Error(`no series for ${symbol}`);
      const ts: number[] = r.timestamp ?? [];
      const adj: Array<number | null> =
        r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? [];
      // One level per month: the last observation in that month.
      const byMonth = new Map<string, number>();
      ts.forEach((t, i) => {
        const v = adj[i];
        if (v === null || v === undefined || !isFinite(v)) return;
        byMonth.set(monthEndISO(t), Number(v));
      });
      return [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
}

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "function is missing its Supabase credentials" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const sb = createClient(url, key);
  const provider = Deno.env.get("MARKET_DATA_PROVIDER") ?? "Yahoo Finance";

  const written: Record<string, number> = {};
  const failed: Record<string, string> = {};

  for (const s of SERIES) {
    try {
      const points = await monthly(s.symbol);
      const rows = points.map(([month, level]) => ({
        benchmark: s.key,
        month,
        total_return_index: level,
        provider,
        symbol: s.symbol,
      }));
      // Chunked so one oversized request cannot fail the whole refresh.
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await sb
          .from("benchmarks")
          .upsert(rows.slice(i, i + 500), { onConflict: "benchmark,month" });
        if (error) throw new Error(error.message);
      }
      written[s.key] = rows.length;
    } catch (e) {
      failed[s.key] = e instanceof Error ? e.message : String(e);
    }
  }

  const ok = Object.keys(failed).length === 0;
  return new Response(JSON.stringify({ ok, written, failed, provider }), {
    status: ok ? 200 : 207,
    headers: { "content-type": "application/json" },
  });
});
