#!/usr/bin/env python3
import json, os
OUT=os.environ.get("STARWELL_OUT", os.path.dirname(os.path.abspath(__file__)))
BASE="https://starwellholdings.com"
CSS=open(os.path.join(OUT,"styles.css")).read()
JS=open(os.path.join(OUT,"script.js")).read()

# ---- shared chrome ----
DESK_NAV='''  <div class="nav-item"><a href="index.html">Home</a></div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">Our Story <span class="chev"></span></button>
    <div class="dropdown">
      <a href="our-story.html#about">About Starwell</a>
      <a href="our-story.html#business-focus">Business Focus</a>
      <a href="our-story.html#strategy">Strategy</a>
      <a href="our-story.html#leadership">Leadership</a>
      <a href="our-story.html#partnership">Partnership</a>
      <a href="our-story.html#legacy">Legacy</a>
    </div>
  </div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">What We Do <span class="chev"></span></button>
    <div class="dropdown">
      <a href="technology.html">Starwell Technologies</a>
      <a href="real-estate.html">Starwell Real Estate</a>
      <a href="capital.html">Starwell Capital</a>
    </div>
  </div>
  <div class="nav-item"><a href="news.html">News</a></div>
  <div class="nav-item"><a href="contact.html" class="nav-cta">Contact</a></div>'''

MOBILE_NAV='''<div class="mmenu" id="mmenu" aria-hidden="true">
  <div class="mmenu-top"><button class="mclose" id="mclose" aria-label="Close menu">&times;</button></div>
  <div class="mlist">
    <a class="mlink" href="index.html">Home</a>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">Our Story <span class="mchev"></span></button>
      <div class="msub">
        <a href="our-story.html#about">About Starwell</a>
        <a href="our-story.html#business-focus">Business Focus</a>
        <a href="our-story.html#strategy">Strategy</a>
        <a href="our-story.html#leadership">Leadership</a>
        <a href="our-story.html#partnership">Partnership</a>
        <a href="our-story.html#legacy">Legacy</a>
      </div>
    </div>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">What We Do <span class="mchev"></span></button>
      <div class="msub">
        <a href="technology.html">Starwell Technologies</a>
        <a href="real-estate.html">Starwell Real Estate</a>
        <a href="capital.html">Starwell Capital</a>
      </div>
    </div>
    <a class="mlink" href="news.html">News</a>
    <a class="mlink" href="contact.html">Contact</a>
  </div>
</div>'''

def header():
    return f'''<a href="#main" class="skip-link">Skip to content</a>
<header class="nav">
  <div class="wrap nav-in">
    <a href="index.html" class="brand" aria-label="Starwell Holdings home">
      <span class="brand-word">Starwell</span>
      <span class="brand-rule"></span>
      <span class="brand-sub">Holdings</span>
    </a>
    <nav class="nav-links" aria-label="Primary">
{DESK_NAV}
    </nav>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mmenu"><span></span><span></span><span></span></button>
  </div>
</header>
{MOBILE_NAV}'''

FOOTER='''<footer class="site">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <div class="brand foot-lockup"><span class="brand-word" style="font-size:27px">Starwell</span><span class="brand-rule" style="height:19px"></span><span class="brand-sub">Holdings</span></div>
        <p>A privately held global investment firm building and owning platforms across technology, real estate, and capital.</p>
      </div>
      <div class="foot-col">
        <h4>Navigation</h4>
        <a href="index.html">Home</a>
        <a href="our-story.html">Our Story</a>
        <a href="technology.html">Starwell Technologies</a>
        <a href="real-estate.html">Starwell Real Estate</a>
        <a href="capital.html">Starwell Capital</a>
        <a href="news.html">News</a>
        <a href="contact.html">Contact</a>
        <a href="careers.html">Careers</a>
        <a href="sitemap.html">Sitemap</a>
      </div>
      <div class="foot-col">
        <h4>Connect</h4>
        <a href="#" rel="noopener">LinkedIn</a>
        <a href="mailto:contact@starwellholdings.com">contact@starwellholdings.com</a>
      </div>
    </div>
    <div class="foot-bot">
      <span>&copy; 2026 Starwell Holdings. All Rights Reserved.</span>
      <a href="#top" class="totop" aria-label="Back to top">&uarr;</a>
    </div>
  </div>
</footer>'''

ORG_LD={"@context":"https://schema.org","@type":"Organization","name":"Starwell Holdings",
  "url":BASE+"/","logo":BASE+"/assets/icon-512.png","image":BASE+"/assets/og-image.png",
  "description":"A privately held global investment and operating company building platforms across technology, real estate, and capital.",
  "foundingDate":"2025","address":{"@type":"PostalAddress","addressLocality":"Tel Aviv","addressCountry":"IL"}}

def render(filename,title,desc,body,extra_ld=None,index=True):
    title=title.replace(" \u2014 "," | ")
    canonical=BASE+"/"+("" if filename=="index.html" else filename)
    robots="index, follow, max-image-preview:large, max-snippet:-1" if index else "noindex, follow"
    lds=[ORG_LD]+([extra_ld] if extra_ld else [])
    ld="\n".join('<script type="application/ld+json">'+json.dumps(l,ensure_ascii=False)+'</script>' for l in lds)
    html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#0B0B0F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Starwell Holdings">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="{BASE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{BASE}/assets/og-image.png">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230F0F12'/%3E%3Ctext x='50' y='50' dy='.35em' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='62' fill='%23F4F3F0'%3ES%3C/text%3E%3C/svg%3E">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600;6..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
{ld}
<style>
{CSS}
</style>
</head>
<body id="top">
{header()}
<main id="main">
{body}
</main>
{FOOTER}
<script>
{JS}
</script>
</body>
</html>'''
    open(os.path.join(OUT,filename),"w").write(html)

# ---- portfolio data (shared with the dashboard) ----
import html as _html
PORTFOLIO=json.load(open(os.path.join(OUT,"data","portfolio.json"),encoding="utf-8"))
def _esc(s): return _html.escape(s or "",quote=True)
def _chip(e):
    if e.get("logo"):
        return f'<img src="{e["logo"]}" alt="{_esc(e["name"])} logo" loading="lazy" decoding="async" style="max-height:48px;max-width:150px;object-fit:contain">'
    return f'<span>{_esc(e.get("logoText") or e["name"])}</span>'
def _web(e):
    u=e.get("website")
    if not u: return ''
    href=u if u not in (True,"true") else '#'
    return f'<a href="{_esc(href)}" target="_blank" rel="noopener" class="link-arrow on-dark" style="font-size:13px">Website &rarr;</a>'
def pf_from(e):
    return f'''      <div class="pf">
        <div class="logo-chip">{_chip(e)}</div>
        <div class="pn">{_esc(e["name"])}</div>
        <div class="meta"><span>Role: {_esc(e.get("role"))}</span></div>
        <div class="pf-actions"><button class="more">&#9432; More Info</button>{_web(e)}</div>
      </div>'''
def xp_from(e):
    rows=f'<div class="meta"><span>&#9679;</span><span>{_esc(e.get("location"))}</span></div>' if e.get("location") else ''
    rows+=f'<div class="meta"><span>&#9632;</span><span>{_esc(e.get("role"))}</span></div>' if e.get("role") else ''
    rows+=f'<div class="meta"><span>&#9651;</span><span>{_esc(e.get("partner"))}</span></div>' if e.get("partner") else ''
    return f'''      <div class="xp">
        <div class="ph-img">{_esc(e.get("image") or "Project")}</div>
        <div class="xp-body">
          <div class="logos"><span class="lchip">{_chip(e) if not e.get("logo") else _esc(e.get("logoText") or e["name"])}</span></div>
          <div class="pn">{_esc(e["name"])}</div>
          {rows}
          <div class="pf-actions"><button class="more">&#9432; More Info</button>{_web(e)}</div>
        </div>
      </div>'''
def cards_for(pillar):
    items=[e for e in PORTFOLIO if e.get("pillar")==pillar]
    if not items: return '      <p style="color:var(--on-panel-soft)">No entries yet.</p>'
    fn=xp_from if pillar=="real-estate" else pf_from
    return "\n".join(fn(e) for e in items)
def highlights():
    items=[e for e in PORTFOLIO if e.get("highlight")]
    if not items: items=PORTFOLIO[:2]
    return "\n".join((xp_from(e) if e.get("pillar")=="real-estate" else pf_from(e)) for e in items)

# ---- legacy helper renderers (kept for any manual use) ----
def pf_card(logo,name,role,website=False):
    return pf_from({"name":name,"role":role,"logoText":logo,"website":"#" if website else ""})
def xp_card(name,location,role,partner,logos,website=False,img="Project"):
    return xp_from({"name":name,"location":location,"role":role,"partner":partner,
                    "logoText":logos[0] if logos else name,"website":"#" if website else "","image":img})

# =================== HOME ===================
home=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Private Investment &amp; Operating Company</span>
    <h1>Dream with<br>Starwell.</h1>
    <p class="lead">Starwell Holdings is a private investment and operating company based in Tel Aviv. We build and hold platforms across technology, real estate, and capital markets.</p>
    <a href="#what-we-do" class="scrolldown" aria-label="Scroll down">&darr;</a>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" id="what-we-do" data-reveal>
    <h2 class="serif">What We Do</h2>
  </section>
</div>
<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="cards">
      <div class="card">
        <h3>Technology</h3>
        <p>We acquire and operate IT managed service providers, applying AI to improve how services are delivered.</p>
        <a href="technology.html" class="link-arrow">Learn More &rarr;</a>
      </div>
      <div class="card">
        <h3>Real Estate</h3>
        <p>Development and general-partner positions in Israel, with select co-investments.</p>
        <a href="real-estate.html" class="link-arrow">Learn More &rarr;</a>
      </div>
      <div class="card">
        <h3>Capital</h3>
        <p>A long-term portfolio across public markets and direct private positions.</p>
        <a href="capital.html" class="link-arrow">Learn More &rarr;</a>
      </div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">Activity Highlights</div>
    <div class="pf-grid">
{highlights()}
    </div>
  </div>
</section>'''
render("index.html","Starwell Holdings | Private Investment & Operating Company",
  "Starwell Holdings is a private investment and operating company based in Tel Aviv, building platforms across technology, real estate, and capital markets.",
  home,extra_ld={"@context":"https://schema.org","@type":"WebSite","name":"Starwell Holdings","url":BASE+"/"})

# =================== OUR STORY ===================
our=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Our Story</span>
    <h1>Our Story</h1>
    <p class="lead">A privately held investment and operating company, built to own and grow businesses over the long term.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" id="about" data-reveal>
    <div class="sec-center" style="margin-bottom:40px"><h2 class="serif">Starwell Holdings</h2></div>
    <div class="body-copy" style="max-width:820px;margin:0 auto;text-align:center;font-size:16px">
      <p>Starwell Holdings is a private investment and operating company. We build, own, and operate businesses across real estate, operating companies, alternative investments, and public markets.</p>
      <p>Starwell is a long-term owner, not a passive allocator. We found companies, scale platforms, and work alongside management teams to grow durable businesses and real assets. Our work pairs hands-on operating involvement with disciplined investing.</p>
      <p>We focus where patient ownership and active partnership create lasting value.</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" id="business-focus" data-reveal style="border-top:1px solid var(--line)">
    <div class="sec-center" style="margin-bottom:18px"><h2 class="serif">Business Focus</h2></div>
    <p class="body-copy" style="max-width:760px;margin:0 auto 50px;text-align:center">Starwell builds and invests in businesses and assets that reward long-term ownership and active management. Our work spans four areas.</p>
    <div class="steps four">
      <div class="step"><h3>Real Estate</h3><p>We develop and operate residential, commercial, and mixed-use assets, partnering with experienced operators through development, asset management, and disposition.</p></div>
      <div class="step"><h3>Operating Businesses</h3><p>We acquire and grow operating companies alongside strong management teams, concentrating on businesses that benefit from operational improvement and patient capital.</p></div>
      <div class="step"><h3>Technology &amp; Innovation</h3><p>We back and build technology-enabled platforms, with an emphasis on applied AI and software that strengthens established industries.</p></div>
      <div class="step"><h3>Public Markets</h3><p>We invest in public equities and alternative strategies with a long-term, fundamentals-driven approach that complements our private holdings.</p></div>
    </div>
    <p class="body-copy" style="max-width:760px;margin:40px auto 0;text-align:center">Across every area, we invest with conviction, align closely with our partners, and stay involved in the businesses we own.</p>
  </section>
</div>

<section class="dark" id="strategy" data-reveal>
  <div class="wrap sec sec-center">
    <h2 class="serif" style="color:var(--on-panel);font-size:clamp(28px,4vw,40px);margin-bottom:20px">Strategy</h2>
    <p class="lede" style="color:var(--on-panel);margin:0 auto;max-width:720px;font-weight:500">We combine patient capital with an operator&rsquo;s mindset, creating value through active involvement and judgment, not financial engineering alone.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" id="leadership" data-reveal>
    <div class="sec-center" style="margin-bottom:44px"><h2 class="serif">Leadership</h2></div>
    <div class="leader">
      <div class="photo">Portrait</div>
      <div>
        <div class="ln">Amit Kochavi</div>
        <div class="lt">Chairman, CEO &amp; Founder</div>
        <div class="body-copy">
          <p>Amit Kochavi founded Starwell Holdings to build a private investment and operating company that pairs long-term capital with operational leadership. His work spans technology, real estate, and public service.</p>
          <p>He founded and holds a stake in Doss, serves as Senior Advisor to the Mayor of Sderot, and takes part in President Herzog&rsquo;s &ldquo;Voice of the People&rdquo; initiative. At Starwell, he leads strategy and capital allocation and stays directly involved in the firm&rsquo;s platforms and partnerships.</p>
        </div>
      </div>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" id="partnership" data-reveal style="border-top:1px solid var(--line)">
    <div class="sec-center"><h2 class="serif" style="margin-bottom:20px">Partnership</h2>
    <p class="body-copy" style="margin:0 auto;text-align:center">We take a small number of positions and commit to them. Where we partner, we aim to be steady, long-term stewards of capital.</p></div>
  </section>
</div>

<section class="dark" id="legacy" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:30px"><h2 class="serif" style="color:var(--on-panel);font-size:clamp(28px,4vw,40px)">Legacy</h2></div>
    <div class="body-copy" style="max-width:780px;margin:0 auto;color:var(--on-panel-soft);text-align:center">
      <p>Starwell builds on four generations of entrepreneurship, capital stewardship, and public service.</p>
      <p>That history traces to Max Factor, who built one of the defining consumer brands of the twentieth century. It runs through David M. Heyman, a businessman and philanthropist whose work helped shape institutions in education and community development. In Israel, it continued with the Buchman family, whose work across business, real estate, and philanthropy contributed to the country&rsquo;s growth over several decades.</p>
      <p>Starwell is the present-day expression of that lineage: a capital base and an operating company built to start businesses, develop real assets, and partner with experienced operators. The values carry over. Integrity, long-term ownership, and a responsibility to build things that last.</p>
    </div>
  </div>
</section>'''
render("our-story.html","Our Story | Starwell Holdings",
  "Starwell Holdings is a privately held investment and operating company built to own and grow businesses over the long term, across real estate, operating companies, technology, and public markets.",
  our)

# =================== TECHNOLOGY ===================
tech=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Technology</span>
    <h1>Starwell<br>Technologies</h1>
    <p class="lead">We acquire control or significant equity in IT services companies in Israel&rsquo;s lower middle market.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">Thesis</div>
    <p class="lede">Israel&rsquo;s IT services market is large, growing, and fragmented. Most of the strongest operators are independent, built on technical expertise and client trust rather than scale.</p>
    <div class="body-copy">
      <p>Starwell Technologies acquires control or significant equity in established, profitable IT services companies. We keep what already works in these businesses and add the systems, reporting, and discipline of a larger platform.</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps">
      <div class="step"><div class="n">01</div><h3>Acquire</h3><p>We take control or significant equity in profitable, established IT services companies in the lower middle market.</p></div>
      <div class="step"><div class="n">02</div><h3>Integrate</h3><p>We centralize systems, share infrastructure, and standardize service delivery across the portfolio.</p></div>
      <div class="step"><div class="n">03</div><h3>Scale</h3><p>We improve operations, develop talent, and expand service lines to grow each company over time.</p></div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">Portfolio</div>
    <div class="pf-grid">
{cards_for("technology")}
    </div>
  </div>
</section>'''
render("technology.html","Starwell Technologies | Starwell Holdings",
  "Starwell Technologies acquires control or significant equity in established, profitable IT services companies in Israel's lower middle market.",
  tech)

# =================== REAL ESTATE ===================
re=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Real Estate</span>
    <h1>Starwell<br>Real Estate</h1>
    <p class="lead">Development and strategic real estate investment across Israel and the United States.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">Markets</div>
    <div class="markets">
      <div class="market">
        <div class="ml">Israel</div>
        <h3>Development &amp; Advisory</h3>
        <p>Residential and mixed-use development in Tel Aviv and central Israel, alongside institutional developers and public-sector partners. We focus on urban renewal and projects with durable demand.</p>
      </div>
      <div class="market">
        <div class="ml">United States</div>
        <h3>Capital Allocation</h3>
        <p>Limited-partner investments in value-add multifamily and industrial logistics, alongside institutional operators with established track records.</p>
      </div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">Selected Experience</div>
    <div class="xp-grid">
{cards_for("real-estate")}
    </div>
  </div>
</section>'''
render("real-estate.html","Starwell Real Estate | Starwell Holdings",
  "Starwell Real Estate covers development and strategic real estate investment across Israel and the United States, with development, advisory, and limited-partner positions.",
  re)

# =================== CAPITAL ===================
cap=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Capital</span>
    <h1>Starwell<br>Capital</h1>
    <p class="lead">The capital allocation arm of Starwell Holdings. We deploy capital across private equity, public markets, hedge funds, and real estate.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">Approach</div>
    <p class="lede">Patient capital allocation across private equity, public markets, and alternative strategies.</p>
    <div class="body-copy">
      <p>Starwell Capital manages the firm&rsquo;s external investments. The mandate covers private equity, with a focus on AI-enabled roll-ups; long-term public market holdings; allocations to long-biased hedge funds; and real estate. We invest with a long horizon and concentrate capital in our best ideas.</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps four">
      <div class="step"><div class="n">01</div><h3>AI Roll-Ups</h3><p>Private equity in AI-native roll-ups that acquire and modernize traditional service businesses.</p></div>
      <div class="step"><div class="n">02</div><h3>Public Markets</h3><p>Long-term, concentrated positions in public companies we understand well and intend to hold.</p></div>
      <div class="step"><div class="n">03</div><h3>Hedge Funds</h3><p>Selective allocations to long-biased managers with a differentiated process and a consistent record.</p></div>
      <div class="step"><div class="n">04</div><h3>Real Estate</h3><p>Allocations to real estate funds and structures within a diversified, long-term portfolio.</p></div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">Portfolio</div>
    <div class="pf-grid">
{cards_for("capital")}
    </div>
  </div>
</section>'''
render("capital.html","Starwell Capital | Starwell Holdings",
  "Starwell Capital is the allocation arm of Starwell Holdings, deploying capital across private equity, public markets, hedge funds, and real estate.",
  cap)

# =================== NEWS ===================
NEWS=[
 ("Real Estate","Dec 20, 2025","Lipa Meir to Rent Offices in Beyond Tower for 11 Million NIS Per Year",
  "Lipa Meir &amp; Co. is leasing roughly 7,000 sqm of office space across four floors in the Beyond Tower in Tel Aviv.","Tel Aviv"),
 ("Company News","Jun 2, 2025","Circles Merges Operations with U.S.-Based Doss",
  "Circles is merging its operations with Doss and will become the Israeli sales and marketing center for the company.","Company News"),
 ("Company News","May 28, 2025","Circles and Doss Announce Merger (Hebrew coverage)",
  "Hebrew-language coverage of the Circles and Doss merger and the combined go-to-market in Israel.","Company News"),
 ("Real Estate","May 5, 2025","Lee &amp; Associates Atlanta Facilitates Sale of 28-Acre Industrial Site to Terminal Logistics",
  "Center Capital&rsquo;s logistics platform, Terminal Logistics, has acquired a 28-acre site in Gainesville, GA.","Industrial"),
 ("Real Estate","Sep 3, 2024","New Givatayim Tower Reaches Key Construction Milestone (Hebrew coverage)",
  "Hebrew-language coverage of construction progress on a new high-rise in Givatayim.","Givatayim"),
 ("Real Estate","Sep 3, 2024","New Tower Claims Title of Tallest in Israel",
  "A new tower in Givatayim claims the title of tallest in Israel, rising to 320 meters with office and residential space.","Tallest Tower"),
 ("Real Estate","Nov 14, 2022","Meitar Leases 17 Floors in Givatayim Tower",
  "Meitar Law Offices leases 17 floors in a Givatayim tower for NIS 54 million annually.","Givatayim"),
]
cats=["All","Real Estate","Company News","Public Markets","Market Commentary","Press Release"]
pills="".join(f'<button class="pill{" active" if c=="All" else ""}" data-cat="{("all" if c=="All" else c)}">{c}</button>' for c in cats)
cards=""
for cat,date,title,blurb,img in NEWS:
    cards+=f'''      <a class="na" data-cat="{cat}" href="#" rel="noopener">
        <div class="ph-img">{img}</div>
        <div class="na-body">
          <div class="row1"><span class="cat">{cat}</span><span class="date">{date}</span></div>
          <h3>{title}</h3>
          <p>{blurb}</p>
          <span class="link-arrow">Read More &rarr;</span>
        </div>
      </a>
'''
news=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">News</span>
    <h1>News</h1>
    <p class="lead">Company news, market commentary, and updates on our investments.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="filters">{pills}</div>
    <div class="news-grid">
{cards}    </div>
    <p class="body-copy" style="font-size:13px;margin-top:34px">Each item links to external coverage. Replace the placeholder links with the source URLs.</p>
  </section>
</div>'''
render("news.html","News | Starwell Holdings",
  "Company news, market commentary, and updates on Starwell Holdings investments and activities.",
  news)

# =================== CONTACT ===================
contact='''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Contact</span>
    <h1>Get in Touch</h1>
    <p class="lead">For investment opportunities, partnerships, or transactions, use the form below. A member of our team will respond.</p>
  </div>
</section>

<div class="wrap">
  <div class="contact-card" data-reveal>
    <form id="contactForm" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="contact">
      <p hidden><label>Leave empty: <input name="bot-field"></label></p>
      <div class="frow">
        <div class="field"><label for="fn">First Name *</label><input id="fn" name="first_name" type="text" required></div>
        <div class="field"><label for="ln">Last Name *</label><input id="ln" name="last_name" type="text" required></div>
      </div>
      <div class="field"><label for="org">Organization</label><input id="org" name="organization" type="text"></div>
      <div class="field"><label for="em">Email *</label><input id="em" name="email" type="email" required></div>
      <div class="field"><label for="sub">Subject</label><input id="sub" name="subject" type="text"></div>
      <div class="field"><label for="msg">Message</label><textarea id="msg" name="message"></textarea></div>
      <div class="captcha"><label for="captchaAnswer">What is 10 + 10?</label><input id="captchaAnswer" name="captcha" type="text" autocomplete="off" required></div>
      <button type="submit" class="btn">Submit</button>
      <div class="formnote" id="formnote" role="status" aria-live="polite"></div>

      <div class="offices">
        <div class="ol">Offices</div>
        <div class="office"><h4>Tel Aviv</h4><p>Beyond Towers<br>Giv&rsquo;atayim, Israel</p></div>
        <div class="office"><h4>Los Angeles</h4><p>11601 Wilshire Blvd<br>Los Angeles, CA 90025<br>USA</p></div>
      </div>
    </form>
  </div>
</div>
<div style="height:60px"></div>'''
render("contact.html","Contact | Starwell Holdings",
  "Contact Starwell Holdings for investment opportunities, partnerships, or transactions. Offices in Tel Aviv and Los Angeles.",
  contact)

# =================== CAREERS ===================
careers='''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Careers</span>
    <h1>Careers</h1>
    <p class="lead">We are a small team and hire rarely. When we do, we look for people who think like owners.</p>
  </div>
</section>
<div class="wrap simple">
  <section class="sec" data-reveal>
    <div class="body-copy">
      <p>Starwell is a privately held investment and operating company. Our work spans technology, real estate, and capital, and the people who do well here tend to be generalists who take ownership and operate with judgment.</p>
      <p>We are not running an active search at the moment, but we are always glad to hear from exceptional people. If that sounds like you, write to us with a short note about what you have built.</p>
    </div>
    <div style="margin-top:30px"><a href="mailto:careers@starwellholdings.com" class="btn">careers@starwellholdings.com</a></div>
  </section>
</div>'''
render("careers.html","Careers | Starwell Holdings",
  "Careers at Starwell Holdings. We hire rarely and look for people who think like owners across technology, real estate, and capital.",
  careers)

# =================== SITEMAP (human) ===================
sm='''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Sitemap</span>
    <h1>Sitemap</h1>
    <p class="lead">Every page on starwellholdings.com.</p>
  </div>
</section>
<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sitemap-cols">
      <div><h4>Company</h4>
        <a href="index.html">Home</a><a href="our-story.html">Our Story</a>
        <a href="news.html">News</a><a href="contact.html">Contact</a><a href="careers.html">Careers</a></div>
      <div><h4>What We Do</h4>
        <a href="technology.html">Starwell Technologies</a><a href="real-estate.html">Starwell Real Estate</a>
        <a href="capital.html">Starwell Capital</a></div>
      <div><h4>Our Story</h4>
        <a href="our-story.html#about">About Starwell</a><a href="our-story.html#business-focus">Business Focus</a>
        <a href="our-story.html#strategy">Strategy</a><a href="our-story.html#leadership">Leadership</a>
        <a href="our-story.html#partnership">Partnership</a><a href="our-story.html#legacy">Legacy</a></div>
    </div>
  </section>
</div>'''
render("sitemap.html","Sitemap | Starwell Holdings",
  "Sitemap for Starwell Holdings: company, platforms, news, and contact pages.",
  sm)

# =================== 404 ===================
nf='''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Error 404</span>
    <h1>Page not found.</h1>
    <p class="lead">The page you are looking for does not exist or has moved.</p>
    <div class="hero-cta"><a href="index.html" class="btn btn-light">Return home</a></div>
  </div>
</section>'''
render("404.html","Page not found | Starwell Holdings","The page could not be found.",nf,index=False)

# =================== sitemap.xml / robots / manifest / configs ===================
pages=[("index.html","1.0"),("our-story.html","0.9"),("technology.html","0.8"),
       ("real-estate.html","0.8"),("capital.html","0.8"),("news.html","0.7"),
       ("contact.html","0.7"),("careers.html","0.5"),("sitemap.html","0.3")]
urls=""
for fn,pr in pages:
    loc=BASE+"/"+("" if fn=="index.html" else fn)
    urls+=f"  <url>\n    <loc>{loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n  </url>\n"
open(os.path.join(OUT,"sitemap.xml"),"w").write(
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls+'</urlset>\n')
open(os.path.join(OUT,"robots.txt"),"w").write("User-agent: *\nAllow: /\n\nSitemap: "+BASE+"/sitemap.xml\n")
open(os.path.join(OUT,"site.webmanifest"),"w").write(json.dumps({
  "name":"Starwell Holdings","short_name":"Starwell","start_url":"/","display":"standalone",
  "background_color":"#0B0B0F","theme_color":"#0B0B0F",
  "icons":[{"src":"assets/favicon-32.png","sizes":"32x32","type":"image/png"},
           {"src":"assets/apple-touch-icon.png","sizes":"180x180","type":"image/png"},
           {"src":"assets/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},indent=2))
open(os.path.join(OUT,"netlify.toml"),"w").write('''[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
''')
open(os.path.join(OUT,"vercel.json"),"w").write(json.dumps({
  "cleanUrls":False,"trailingSlash":False,
  "headers":[{"source":"/(.*)","headers":[
    {"key":"X-Content-Type-Options","value":"nosniff"},
    {"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"}]}]},indent=2))
print("PAGES BUILT")
print(sorted(os.listdir(OUT)))
