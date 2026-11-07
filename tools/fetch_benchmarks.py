#!/usr/bin/env python3
"""Fetch monthly benchmark levels and write assets/benchmarks.json.

This runs on a schedule in CI, never in the browser. The provider's endpoint
is public and needs no key, so nothing secret is involved, but the fetch stays
server side all the same: the page only ever reads the file this writes, from
its own origin, which also means the Dashboard keeps working when the provider
is down or rate limiting.

    python3 tools/fetch_benchmarks.py
    python3 tools/fetch_benchmarks.py --out assets/benchmarks.json

Exits non-zero if any series fails, after writing whatever did succeed, so a
partial outage does not wipe the file.
"""

import argparse
import datetime as dt
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "assets" / "benchmarks.json"
PROVIDER = "Yahoo Finance"
HOST = "https://query2.finance.yahoo.com/v8/finance/chart/"

# key -> symbol. The keys match assets/hq-settings.js. USDILS is not shown on
# its own: it is what turns TA-125 from shekels into dollars.
SERIES = [
    ("SP500", "SPY"),
    ("NDX", "QQQ"),
    ("ACWI", "ACWI"),
    ("AGG", "AGG"),
    ("TA125", "^TA125.TA"),
    ("USDILS", "ILS=X"),
]
START = int(dt.datetime(2017, 1, 1, tzinfo=dt.timezone.utc).timestamp())


def month_end(epoch: int) -> str:
    d = dt.datetime.fromtimestamp(epoch, dt.timezone.utc).date()
    nxt = dt.date(d.year + (d.month == 12), (d.month % 12) + 1, 1)
    return (nxt - dt.timedelta(days=1)).isoformat()


def monthly(symbol: str, tries: int = 4):
    end = int(time.time()) + 86400
    url = (f"{HOST}{urllib.parse.quote(symbol)}"
           f"?period1={START}&period2={end}&interval=1mo&events=div")
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                j = json.load(r)
            res = (j.get("chart") or {}).get("result") or []
            if not res:
                raise ValueError(f"no series returned for {symbol}")
            res = res[0]
            stamps = res.get("timestamp") or []
            ind = res.get("indicators") or {}
            adj = None
            if ind.get("adjclose"):
                adj = ind["adjclose"][0].get("adjclose")
            if not adj and ind.get("quote"):
                adj = ind["quote"][0].get("close")
            if not adj:
                raise ValueError(f"no closing levels for {symbol}")
            # one level per month: the last observation in that month
            by_month = {}
            for t, v in zip(stamps, adj):
                if v is None:
                    continue
                by_month[month_end(t)] = round(float(v), 6)
            if len(by_month) < 12:
                raise ValueError(f"only {len(by_month)} months for {symbol}")
            return sorted(by_month.items())
        except Exception as exc:                      # noqa: BLE001 - reported below
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{symbol}: {last}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    args = ap.parse_args()
    out = pathlib.Path(args.out)

    # Start from what is already published, so a series that fails today keeps
    # the levels it had rather than disappearing from the page.
    existing = {}
    if out.exists():
        try:
            existing = json.loads(out.read_text(encoding="utf-8")).get("series", {})
        except Exception:                             # noqa: BLE001
            existing = {}

    series, failed = {}, {}
    for key, symbol in SERIES:
        try:
            points = monthly(symbol)
            series[key] = {"symbol": symbol, "points": points}
            print(f"{key:7s} {symbol:12s} {len(points):4d} months, through {points[-1][0]}")
        except Exception as exc:                      # noqa: BLE001
            failed[key] = str(exc)
            if key in existing:
                series[key] = existing[key]
                print(f"{key:7s} {symbol:12s} FAILED, keeping what was published: {exc}")
            else:
                print(f"{key:7s} {symbol:12s} FAILED, nothing published before: {exc}")

    if not series:
        print("nothing fetched and nothing to keep: the file is left as it was")
        return 1

    through = max(s["points"][-1][0] for s in series.values())
    payload = {
        "fetchedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "provider": PROVIDER,
        "through": through,
        "note": "Monthly total return levels from adjusted closes. "
                "Fetched on a schedule in CI, never from the browser.",
        "series": series,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n",
                   encoding="utf-8")
    print(f"wrote {out} · {len(series)} series · through {through}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
