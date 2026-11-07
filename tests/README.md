# Starwell Portal tests

| File | What it does |
| --- | --- |
| `engine-node.js` | Loads the browser engine (`assets/hq-*.js`) under Node against a directory of Main DB CSVs. Run it directly to print what the Dashboard would show. |
| `acceptance.js` | The figures the quarterly review reports, the allocation, the money-weighted returns, the benchmarks, and the change tests. Run with `node tests/acceptance.js`. |
| `hq-mobile.spec.js` | Playwright: no page-level horizontal scroll on any view at 375, 393, 768 and 1440, every chart draws, the drawer opens and closes four ways, every tap target clears 44px. |
| `hq-harness.js` | Shared Playwright context. Stubs Supabase so the gate opens and serves Main DB from CSVs. |
| `shots.js` | Screenshots of the Dashboard at 375 and 1440. |
| `snapshot_maindb.py` | Saves a copy of Main DB as a fixture. |

## Fixtures

`tests/fixtures/` holds **synthetic** sheets: invented names and balances that
reproduce the shapes the engine has to handle (a missing month, an account
that opens mid-period, one that stops reporting, a duplicate row, a sold
property, a loan in shekels). It also holds `Benchmarks.csv`, which is public
market data and is real. These are committed and the Playwright suite uses
them.

`tests/fixtures-private/` holds a real copy of Main DB. **It is never
committed**: this repository is public and those are the family's balances.
`.gitignore` excludes the directory. Refill it with:

```sh
python3 tests/snapshot_maindb.py --out tests/fixtures-private/maindb-2026-11-05
```

`acceptance.js` asserts the reported figures against that snapshot and skips
with exit code 2 when it is not there. It never reads the live workbook, so a
change in Main DB cannot quietly rewrite an expected answer, and the live page
is never frozen to match a test.

A second copy, `maindb-2026-11-05-with-liabilities`, is the same snapshot plus
the `Liabilities` sheet Main DB does not have yet. It is what proves the loan
figures are right the moment that sheet exists. Create it with:

```sh
cp -r tests/fixtures-private/maindb-2026-11-05 \
      tests/fixtures-private/maindb-2026-11-05-with-liabilities
cat > tests/fixtures-private/maindb-2026-11-05-with-liabilities/Liabilities.csv <<'CSV'
AccountID,Date,Balance,Currency,FXRateToUSD,Rate,Notes
SCHWAB_0687,2026-10-31,52396.91,USD,1,0.10625,Margin loan. The statement value is already net of it.
FIBI_314390,2026-10-31,37632.19,ILS,0.3225806452,,Loan against the Israeli brokerage account.
CSV
cp tests/fixtures/Benchmarks.csv \
   tests/fixtures-private/maindb-2026-11-05-with-liabilities/
```

## Running everything

```sh
python3 -m http.server 8899 &            # the Playwright suite needs a server
node tests/acceptance.js
node tests/hq-mobile.spec.js
```
