#!/usr/bin/env python3
"""Save a copy of Main DB as a test fixture.

The tests assert real figures, so they need a real copy of the workbook. This
repository is public, so that copy must never be committed. The snapshot is
therefore written to tests/fixtures-private, which .gitignore excludes, and
this script refills it from Main DB whenever it is needed.

    python3 tests/snapshot_maindb.py                       # the default date
    python3 tests/snapshot_maindb.py --out some/other/dir
    python3 tests/snapshot_maindb.py --url <published url>

The published URL is read from MAIN_DB_PUB_URL, or from assets/hq-settings.js
when that variable is not set.
"""

import argparse
import csv
import io
import os
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "tests" / "fixtures-private" / "maindb-latest"

SHEETS = [
    "Accounts",
    "Statements",
    "Investment Ledger",
    "Distributions",
    "20 Vitkin Street - APT #2",
    "Glaser Real Estate",
    "Jewelry",
    # optional, saved when the workbook has them
    "Liabilities",
    "Benchmarks",
    "Holdings",
]
OPTIONAL = {"Liabilities", "Benchmarks", "Holdings"}


def slug(name: str) -> str:
    return re.sub(r"^_|_$", "", re.sub(r"[^A-Za-z0-9]+", "_", name))


def pub_url() -> str:
    url = os.environ.get("MAIN_DB_PUB_URL")
    if url:
        return url.rstrip("/")
    src = (ROOT / "assets" / "hq-settings.js").read_text(encoding="utf-8")
    m = re.search(r'mainDbPubUrl:\s*\n?\s*"([^"]+)"', src)
    if not m:
        sys.exit("no Main DB URL in MAIN_DB_PUB_URL or assets/hq-settings.js")
    return m.group(1).rstrip("/")


def get(url: str, tries: int = 4) -> str:
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "starwell-snapshot"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8")
        except Exception as exc:          # noqa: BLE001 - reported below
            last = exc
            time.sleep(2 * (attempt + 1))
    raise SystemExit(f"could not read {url}: {last}")


def tabs(base: str) -> dict:
    html = get(base + "/pubhtml")
    names = re.findall(r'\{name:\s*"(.*?)"', html)
    gids = re.findall(r'gid:\s*"?(\d+)"?', html)
    if not names or len(names) != len(gids):
        pairs = re.findall(r'<li[^>]*>\s*<a[^>]*href=["\']?#gid=(\d+)["\']?[^>]*>([^<]+)</a>', html, re.I)
        gids = [p[0] for p in pairs]
        names = [p[1] for p in pairs]
    if not names:
        raise SystemExit("no sheet tabs found at the published workbook URL")

    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", s.lower())

    return {norm(n): g for n, g in zip(names, gids)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--url", default=None)
    args = ap.parse_args()

    base = (args.url or pub_url()).rstrip("/")
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    found = tabs(base)
    written, missing = [], []
    for sheet in SHEETS:
        gid = found.get(re.sub(r"[^a-z0-9]", "", sheet.lower()))
        if not gid:
            if sheet not in OPTIONAL:
                missing.append(sheet)
            continue
        text = get(f"{base}/pub?gid={gid}&single=true&output=csv")
        rows = list(csv.reader(io.StringIO(text)))
        path = out / f"{slug(sheet)}.csv"
        with path.open("w", newline="", encoding="utf-8") as fh:
            csv.writer(fh).writerows(rows)
        written.append(f"{sheet}: {max(0, len(rows) - 1)} rows")

    if missing:
        return int(bool(print("sheets not found in Main DB:", ", ".join(missing))) or 1)

    readme = out / "README.txt"
    readme.write_text(
        "Main DB snapshot. Real balances: never commit this directory.\n"
        "Refill it with: python3 tests/snapshot_maindb.py --out " + str(out) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(written)} sheets to {out}")
    for line in written:
        print("  " + line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
