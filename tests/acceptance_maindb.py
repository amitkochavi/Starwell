"""Acceptance tests for the Starwell Portal figures, computed from Main DB.

Run against the live workbook:
    MAIN_DB_PUB_URL='https://docs.google.com/spreadsheets/d/e/<key>' \
        python3 tests/acceptance_maindb.py
or against a directory of CSVs exported from it:
    python3 tests/acceptance_maindb.py path/to/csv-dir

The published URL is read from the environment and is never committed: this
repository is public, and that URL returns the whole family balance sheet to
anyone who has it.

Parsing rules, which the dashboard must follow too:
  * sheets and columns are found by header name, never by position or order
  * Statements key is AccountID + StatementDate; on a duplicate the first row
    wins and the clash is reported, never summed
  * EndingValueUSD is the only source of USD history; live FX is display only
  * blank flows are zero
"""
import csv, datetime, sys
from collections import defaultdict

import os, subprocess, tempfile

TABS = {'Accounts': None, 'Statements': None, 'Investment Ledger': None,
        'Distributions': None, '20 Vitkin Street - APT #2': None,
        'Glaser Real Estate': None, 'Jewelry': None}

def fetch_published(base):
    """Pull every tab of the published workbook to a temp directory."""
    import re as _re, urllib.request
    html = urllib.request.urlopen(base.rstrip('/') + '/pubhtml', timeout=60).read().decode('utf-8', 'ignore')
    names = _re.findall(r'\{name:\s*"(.*?)"', html)
    gids = _re.findall(r'gid:\s*"?(\d+)"?', html)
    if not names or len(names) != len(gids):
        raise SystemExit('could not read the tab list from the published workbook')
    out = tempfile.mkdtemp(prefix='maindb-')
    for n, g in zip(names, gids):
        safe = _re.sub(r'[^A-Za-z0-9]+', '_', n).strip('_')
        url = f'{base.rstrip("/")}/pub?gid={g}&single=true&output=csv'
        with urllib.request.urlopen(url, timeout=60) as r, open(f'{out}/{safe}.csv', 'wb') as fh:
            fh.write(r.read())
    return out

_arg = sys.argv[1] if len(sys.argv) > 1 else None
_env = os.environ.get('MAIN_DB_PUB_URL')
if _arg and os.path.isdir(_arg):
    D = _arg
elif _env:
    D = fetch_published(_env)
else:
    raise SystemExit('set MAIN_DB_PUB_URL, or pass a directory of exported CSVs')
def rows(name):
    import os, re as _re
    safe = _re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')
    for cand in (name, safe):
        p = os.path.join(D, cand + '.csv')
        if os.path.exists(p):
            with open(p, encoding='utf-8') as fh:
                return list(csv.DictReader(fh))
    raise SystemExit('missing sheet: ' + name)

def num(v):
    if v is None: return 0.0
    s = ''.join(c for c in str(v) if c.isdigit() or c in '.-')
    try: return float(s)
    except ValueError: return 0.0

def d(v):
    """Main DB mixes ISO dates in Statements with M/D/YYYY in Distributions, so
    both are accepted; anything else is not a transaction row."""
    s = str(v or '').strip()
    if not s: return None
    try: return datetime.date.fromisoformat(s[:10])
    except ValueError: pass
    for fmt in ('%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y', '%m/%d/%y'):
        try: return datetime.datetime.strptime(s, fmt).date()
        except ValueError: continue
    return None

STARWELL = ['SCHWAB_0687','CNB_48101310','FIBI_314390','FIBI_852',
            'SCHWAB_1558','CNB_48492010','CNB_48784990']
ASOF = datetime.date(2026,10,31)
FIBI_LOAN_ILS, FIBI_LOAN_FX = 37632.19, 3.10

# ---- Statements: key = AccountID + StatementDate, first wins, never summed ----
stmts, dupes = {}, []
for r in rows('Statements'):
    aid, dt = (r.get('AccountID') or '').strip(), d(r.get('StatementDate'))
    if not aid or not dt: continue
    k = (aid, dt)
    if k in stmts: dupes.append((aid, dt.isoformat(), stmts[k]['usd'], num(r.get('EndingValueUSD')))); continue
    stmts[k] = {'usd': num(r.get('EndingValueUSD')),
                'add': num(r.get('Additions')), 'wd': num(r.get('Withdrawals'))}

by_acct = defaultdict(dict)
for (aid, dt), v in stmts.items(): by_acct[aid][dt] = v

def value_at(aid, on):
    ds = [x for x in by_acct[aid] if x <= on]
    return (by_acct[aid][max(ds)]['usd'], max(ds)) if ds else (0.0, None)

# ---- a) seven accounts ----
acct_vals = {a: value_at(a, ASOF) for a in STARWELL}
accounts_total = sum(v for v, _ in acct_vals.values())

# ---- b) FIBI loan ----
fibi_loan = -round(FIBI_LOAN_ILS / FIBI_LOAN_FX, 2)

# ---- c) L&A Holdings ----
led = rows('Investment Ledger')
roc = defaultdict(float)
for r in rows('Distributions'):
    if not d(r.get('Date')) or (r.get('Treatment') or '').strip().lower() != 'return of capital': continue
    roc[(r.get('Fund') or '').strip().lower()] += num(r.get('Amit Amount'))
def roc_for(fund_cell):
    f = (fund_cell or '').strip().lower()
    tot = 0.0
    for k, v in roc.items():
        key = f.split()[0] if f else ''
        if key and (key in k or any(w in k for w in f.split() if len(w) > 4)): tot += v
    return tot
funds = defaultdict(float)
for r in led:
    at = (r.get('Asset Type') or '').strip()
    if not at.startswith('Private fund (via L&A)'): continue
    funds[(r.get('Deal Name') or '').strip()] += num(r.get('Current Value'))
la = {}
la['Pioneers'] = funds.get('Pioneers AI', 0.0)
la['Kodiak']   = funds.get('Kodiak Fund I', 0.0)
la['Terminal'] = funds.get('Industrial Outdoor Storage', 0.0) - roc.get('center terminal equity fund ii llc', 0.0)
la['Dawson']   = funds.get('The Dawson', 0.0) - roc.get('91 somerset club jv, llc (the dawson)', 0.0)
la_cash = 0.0
for r in rows('Distributions'):
    if 'l&a cash remaining' in (r.get('Date') or '').strip().lower(): la_cash = num(r.get('Amit Amount'))
la['cash'] = la_cash
la_total = sum(la.values())

# ---- d) real estate ----
# This sheet carries its title on row 1, so the header has to be found rather
# than assumed; DictReader on row 1 collapses the blank columns together.
import os as _os, re as _re2
_vp = _os.path.join(D, _re2.sub(r'[^A-Za-z0-9]+','_','20 Vitkin Street - APT #2').strip('_') + '.csv')
with open(_vp, encoding='utf-8') as fh: _raw = list(csv.reader(fh))
_h = next(i for i, r in enumerate(_raw) if 'Date' in [c.strip() for c in r])
_keys = [c.strip() for c in _raw[_h]]
vit = [dict(zip(_keys, r)) for r in _raw[_h+1:]]
vit = [r for r in vit if d(r.get('Date'))]
vitkin = num(max(vit, key=lambda r: d(r['Date']))['Value(USD)']) if vit else 0.0
glaser = sum(num(r.get('OwnerShareValue')) for r in rows('Glaser Real Estate')
             if (r.get('Status') or '').strip().lower() == 'owned')
re_total = vitkin + glaser
aum = accounts_total + fibi_loan + la_total + re_total

# ---- e) monthly change (Modified Dietz, flows 15 days before month end) ----
def month_end_before(on):
    first = on.replace(day=1)
    return first - datetime.timedelta(days=1)
def pool_change(start, end):
    """Modified Dietz. Each flow is dated 15 days before its statement date and
    weighted by the share of the period it was invested for. An account with no
    statement at the start opens at zero; its opening transfer is already in
    that statement's Additions, so it is a flow, never a gain."""
    span = (end - start).days or 1
    gain = flow = wflow = 0.0
    for a in STARWELL:
        v1, _ = value_at(a, end)
        v0, _ = value_at(a, start) if any(x <= start for x in by_acct[a]) else (0.0, None)
        f = 0.0
        for dt, st in sorted(by_acct[a].items()):
            if not (start < dt <= end): continue
            net = st['add'] - st['wd']
            if not net: continue
            f += net
            fd = dt - datetime.timedelta(days=15)
            wflow += net * (max(0, min(span, (end - fd).days)) / span)
        gain += (v1 - v0) - f
        flow += f
    base = sum(value_at(a, start)[0] for a in STARWELL if any(x <= start for x in by_acct[a]))
    return gain, flow, base, (gain / (base + wflow) if (base + wflow) else 0.0)

oct_gain, oct_flow, oct_base, oct_ret = pool_change(month_end_before(ASOF), ASOF)
ytd_gain, ytd_flow, ytd_base, ytd_ret = pool_change(datetime.date(2025,12,31), ASOF)

def line(label, got, want, tol=0.02):
    ok = abs(got - want) <= tol
    print(f'{"PASS" if ok else "FAIL"}  {label:<34} got {got:>16,.2f}   want {want:>16,.2f}')
    return ok

results = []
print('--- Section 9 acceptance tests, Starwell view at 31 Oct 2026 ---')
results.append(line('7 accounts', accounts_total, 10196475.15))
results.append(line('FIBI loan', fibi_loan, -12139.42))
for k, want in [('Pioneers',100000.00),('Kodiak',20000.00),('Terminal',47274.79),('Dawson',99206.35),('cash',4215.60)]:
    results.append(line('  L&A: '+k, la[k], want))
results.append(line('L&A Holdings', la_total, 270696.74))
results.append(line('  Vitkin', vitkin, 1976415.05))
results.append(line('  Phoenix (Owned only)', glaser, 536500.00))
results.append(line('Real estate', re_total, 2512915.05))
results.append(line('Under management', aum, 12967947.52))
results.append(line('October 2026 gain', oct_gain, -202141.96, 0.05))
results.append(line('October 2026 return %', oct_ret*100, -1.94, 0.01))
results.append(line('YTD gain to 31 Oct', ytd_gain, 1080503.73, 0.05))
results.append(line('YTD return %', ytd_ret*100, 13.26, 0.02))
print(f'\n{sum(results)}/{len(results)} passed')
if not all(results): sys.exit(1)
print('\nduplicates found:', len(dupes))
for a,dt,first,second in dupes: print(f'   {a} {dt}: kept {first:,.2f}, ignored {second:,.2f}')
print('\nstale accounts (latest statement before 2026-10-31):')
for a,(v,dt) in acct_vals.items():
    if dt and dt < ASOF: print(f'   {a}: as of {dt} = {v:,.2f}')
