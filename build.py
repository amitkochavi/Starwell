#!/usr/bin/env python3
import json, os
OUT=os.environ.get("STARWELL_OUT", os.path.dirname(os.path.abspath(__file__)))
BASE="https://starwellholdings.com"
CSS=open(os.path.join(OUT,"styles.css")).read()
JS=open(os.path.join(OUT,"script.js")).read()

# ---- Supabase (public, read-only): lets the live site show content edited
# in the HQ dashboard. The anon key is public by design; writes are blocked by
# Row-Level Security. Leave blank to keep the site fully static (baked content).
SB_URL=os.environ.get("STARWELL_SB_URL","https://leozizmosbwhwfkzoovt.supabase.co")
SB_ANON=os.environ.get("STARWELL_SB_ANON","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlb3ppem1vc2J3aHdma3pvb3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQ3MjQsImV4cCI6MjA5Nzg2MDcyNH0.eFb8e5a4x09QYYFHZ1ER23v5bzie8WJz6ZLdsfrcd6s")
def live_script(kind):
    if not (SB_URL and SB_ANON): return ""
    sdk='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    body=open(os.path.join(OUT,"assets","live-"+kind+".js")).read()
    cfg=f'window.SB_URL={json.dumps(SB_URL)};window.SB_ANON={json.dumps(SB_ANON)};'
    return f'{sdk}\n<script>{cfg}\n{body}</script>'

# ---- shared chrome ----
DESK_NAV='''  <div class="nav-item"><a href="index.html">Home</a></div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">Our Story <span class="chev"></span></button>
    <div class="dropdown">
      <a href="our-story.html#about">About Starwell</a>
      <a href="our-story.html#partnership">Partnership</a>
      <a href="our-story.html#business-focus">Business Focus</a>
      <a href="our-story.html#strategy">Strategy</a>
      <a href="our-story.html#leadership">Leadership</a>
      <a href="our-story.html#legacy">Legacy</a>
    </div>
  </div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">What We Do <span class="chev"></span></button>
    <div class="dropdown">
      <a href="technology.html">Technology</a>
      <a href="real-estate.html">Real Estate</a>
      <a href="capital.html">Capital</a>
    </div>
  </div>
  <div class="nav-item"><a href="news.html">News</a></div>
  <div class="nav-item"><a href="contact.html">Contact</a></div>'''

MOBILE_NAV='''<div class="mmenu" id="mmenu" aria-hidden="true">
  <div class="mmenu-top"><button class="mclose" id="mclose" aria-label="Close menu">&times;</button></div>
  <div class="mlist">
    <a class="mlink" href="index.html">Home</a>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">Our Story <span class="mchev"></span></button>
      <div class="msub">
        <a href="our-story.html#about">About Starwell</a>
        <a href="our-story.html#partnership">Partnership</a>
        <a href="our-story.html#business-focus">Business Focus</a>
        <a href="our-story.html#strategy">Strategy</a>
        <a href="our-story.html#leadership">Leadership</a>
        <a href="our-story.html#legacy">Legacy</a>
      </div>
    </div>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">What We Do <span class="mchev"></span></button>
      <div class="msub">
        <a href="technology.html">Technology</a>
        <a href="real-estate.html">Real Estate</a>
        <a href="capital.html">Capital</a>
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
      <span class="brand-word">Starwell Holdings</span>
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
        <div class="brand foot-lockup"><span class="brand-word" style="font-size:27px">Starwell Holdings</span></div>
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
        <a href="https://www.linkedin.com/company/starwell-holdings/" target="_blank" rel="noopener">LinkedIn</a>
        <a href="mailto:contact@starwellholdings.com">contact@starwellholdings.com</a>
      </div>
    </div>
    <div class="foot-bot">
      <span>&copy; 2026 Starwell Holdings. All Rights Reserved.</span>
      <a href="#top" class="totop" aria-label="Back to top">&uarr;</a>
    </div>
  </div>
</footer>'''

ORG_LD={"@context":"https://schema.org","@type":"Organization","@id":BASE+"/#organization",
  "name":"Starwell Holdings","alternateName":"Starwell","legalName":"Starwell Holdings",
  "url":BASE+"/","logo":{"@type":"ImageObject","url":BASE+"/assets/icon-512.png","width":512,"height":512},
  "image":BASE+"/assets/og-image.png",
  "description":"A privately held global investment and operating company building platforms across technology, real estate, and capital.",
  "foundingDate":"2025","address":{"@type":"PostalAddress","addressLocality":"Tel Aviv","addressCountry":"IL"},
  "contactPoint":{"@type":"ContactPoint","email":"contact@starwellholdings.com","contactType":"investor relations"},
  "sameAs":["https://www.linkedin.com/company/starwell-holdings/"]}

def render(filename,title,desc,body,extra_ld=None,index=True,extra=""):
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
<link rel="icon" type="image/png" sizes="512x512" href="assets/icon-512.png">
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
{extra}
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
    role=f'<div class="meta"><span>Role: {_esc(e.get("role"))}</span></div>' if e.get("role") else ''
    desc=f'<p class="pf-desc">{_esc(e.get("description"))}</p>' if e.get("description") else ''
    web=_web(e)
    actions=f'<div class="pf-actions">{web}</div>' if web else ''
    return f'''      <div class="pf">
        <div class="logo-chip">{_chip(e)}</div>
        <div class="pn">{_esc(e["name"])}</div>
        {role}{desc}
        {actions}
      </div>'''
def xp_from(e):
    rows=f'<div class="meta"><span>&#9679;</span><span>{_esc(e.get("location"))}</span></div>' if e.get("location") else ''
    rows+=f'<div class="meta"><span>&#9632;</span><span>{_esc(e.get("role"))}</span></div>' if e.get("role") else ''
    rows+=f'<div class="meta"><span>&#9651;</span><span>{_esc(e.get("partner"))}</span></div>' if e.get("partner") else ''
    desc=f'<p class="xp-desc">{_esc(e.get("description"))}</p>' if e.get("description") else ''
    web=_web(e)
    actions=f'<div class="pf-actions">{web}</div>' if web else ''
    media=f'<img src="{_esc(e.get("imageUrl"))}" alt="{_esc(e["name"])}" loading="lazy" decoding="async">' if e.get("imageUrl") else _esc(e.get("image") or "Project")
    return f'''      <div class="xp">
        <div class="ph-img">{media}</div>
        <div class="xp-body">
          <div class="logos"><span class="lchip">{_chip(e) if not e.get("logo") else _esc(e.get("logoText") or e["name"])}</span></div>
          <div class="pn">{_esc(e["name"])}</div>
          {rows}
          {desc}
          {actions}
        </div>
      </div>'''
def cards_for(pillar):
    items=[e for e in PORTFOLIO if e.get("pillar")==pillar]
    items.sort(key=lambda e:e.get("order",99))
    if not items: return '      <p style="color:var(--on-panel-soft)">No entries yet.</p>'
    fn=xp_from if pillar=="real-estate" else pf_from
    return "\n".join(fn(e) for e in items)
def highlights():
    items=[e for e in PORTFOLIO if e.get("highlight")]
    if not items: items=PORTFOLIO[:2]
    items.sort(key=lambda e:e.get("highlightOrder",99))
    return "\n".join((xp_from(e) if e.get("pillar")=="real-estate" else pf_from(e)) for e in items)

# ---- legacy helper renderers (kept for any manual use) ----
def pf_card(logo,name,role,website=False):
    return pf_from({"name":name,"role":role,"logoText":logo,"website":"#" if website else ""})
def xp_card(name,location,role,partner,logos,website=False,img="Project"):
    return xp_from({"name":name,"location":location,"role":role,"partner":partner,
                    "logoText":logos[0] if logos else name,"website":"#" if website else "","image":img})

# =================== HOME ===================
home=f'''<section class="hero hero-home">
  <div class="wrap">
    <h1>Dream with Starwell.</h1>
    <p class="lead">Starwell Holdings is a private investment and operating company headquartered in Tel Aviv, building platforms across technology, real estate, and capital markets.</p>
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
        <p>IT services platform: acquiring and operating MSPs, AI-driven service delivery.</p>
        <a href="technology.html" class="link-arrow">Learn More &rarr;</a>
      </div>
      <div class="card">
        <h3>Real Estate</h3>
        <p>Development and GP investments in Israel, select co-investments.</p>
        <a href="real-estate.html" class="link-arrow">Learn More &rarr;</a>
      </div>
      <div class="card">
        <h3>Capital</h3>
        <p>Long-term investment portfolio across public markets and direct private positions.</p>
        <a href="capital.html" class="link-arrow">Learn More &rarr;</a>
      </div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="carousel-head">
      <h2 class="serif">Activity Highlights</h2>
      <div class="carousel-nav">
        <button class="cbtn cprev" type="button" aria-label="Previous">&#8249;</button>
        <button class="cbtn cnext" type="button" aria-label="Next">&#8250;</button>
      </div>
    </div>
    <div class="pf-carousel" id="hl-carousel">
{highlights()}
    </div>
  </div>
</section>'''
render("index.html","Starwell Holdings | Private Investment & Operating Company",
  "Starwell Holdings is a private investment and operating company based in Tel Aviv, building platforms across technology, real estate, and capital markets.",
  home,extra_ld={"@context":"https://schema.org","@type":"WebSite","@id":BASE+"/#website",
    "name":"Starwell Holdings","alternateName":"Starwell","url":BASE+"/",
    "publisher":{"@id":BASE+"/#organization"}})

# =================== OUR STORY ===================
SB="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/"
PARTNERS=[
  ("Tidhar", SB+"ed0e4f174_5aae560d-4622-4639-9a90-a4dc20483398.jpg"),
  ("Union Group", SB+"d4e85ea44_images2.png"),
  ("Center Capital", SB+"c020e8ecf_centercaplog.png"),
  ("Wilpon & Co.", SB+"74d15b488_wilpon.png"),
  ("Noked Capital", SB+"0b7882a5e_Screenshot2025-12-20at095550.png"),
  ("Hazavim", SB+"7198da834_logo-black-new.png"),
]
# Duplicate the set so the marquee track loops seamlessly (animation shifts by -50%).
def _pset(hidden):
    hid=' aria-hidden="true"' if hidden else ''
    return "".join(
        f'<span class="m-logo"><img src="{u}" alt="{_esc(n)}" loading="lazy" decoding="async"{hid}></span>'
        for n,u in PARTNERS)
partner_marquee=f'''<div class="marquee" aria-label="Selected partners">
      <div class="marquee-track">{_pset(False)}{_pset(True)}</div>
    </div>'''
our=f'''<section class="hero hero-center">
  <div class="wrap">
    <h1>Our Story</h1>
  </div>
</section>

<div class="wrap">
  <section class="sec" id="about" data-reveal>
    <div class="sec-center" style="margin-bottom:34px"><h2 class="serif">Starwell Holdings</h2></div>
    <div class="body-copy" style="max-width:880px;margin:0 auto;text-align:center;font-size:16px">
      <p>Starwell Holdings is a global private investment and operating company. We invest and build across real estate, operating businesses, alternative investments, and public markets.</p>
      <p>Beyond capital allocation, Starwell acts as a long-term owner and active partner&mdash;founding companies, scaling platforms, and working alongside management teams to develop durable businesses and real assets. Our approach combines entrepreneurial execution with disciplined investment principles.</p>
      <p>We focus on opportunities where long-term thinking, operational involvement, and strategic alignment can create enduring value across cycles and generations.</p>
    </div>
  </section>
</div>

<section class="dark" id="business-focus" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:18px"><h2 class="serif">Business Focus</h2></div>
    <div class="body-copy" style="max-width:780px;margin:0 auto 50px;text-align:center">
      <p>Starwell focuses on building and investing in businesses and assets where long-term ownership, active involvement, and disciplined execution drive sustainable value.</p>
      <p>Our activities span four core areas:</p>
    </div>
    <div class="steps four">
      <div class="step"><h3>Real Estate</h3><p>We invest in, develop, and operate residential, commercial, and mixed-use assets, partnering with experienced operators and taking an owner-led approach to development, asset management, and value creation.</p></div>
      <div class="step"><h3>Operating Businesses</h3><p>Starwell builds and scales operating companies alongside strong management teams, with a focus on businesses that benefit from strategic guidance, operational improvement, and long-term capital support.</p></div>
      <div class="step"><h3>Technology &amp; Innovation</h3><p>We back and help build technology-enabled platforms, with particular emphasis on applied technology, AI-driven solutions, and businesses that enhance traditional industries through innovation.</p></div>
      <div class="step"><h3>Public Markets &amp; Alternatives</h3><p>We allocate capital across public equities and alternative investments with a long-term, fundamentals-driven mindset, complementing our private market and operating activities.</p></div>
    </div>
    <p class="body-copy" style="max-width:780px;margin:50px auto 0;text-align:center">Across all areas, Starwell prioritizes conviction-led investments, alignment with partners, and a hands-on approach that reflects our belief in building enduring value over time.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" id="strategy" data-reveal>
    <h2 class="serif" style="margin-bottom:20px">Strategy</h2>
    <p class="body-copy" style="margin:0 auto;text-align:center;max-width:760px">Our approach combines long-term, disciplined capital with an operator&rsquo;s mindset. We prioritize value creation through active engagement and strategic guidance.</p>
  </section>
</div>

<section class="dark" id="leadership" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:44px"><h2 class="serif">Starwell Leadership</h2></div>
    <div class="leader">
      <div class="photo"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/3f93d596d_AmitKochaviPic.jpg" alt="Amit Kochavi" loading="lazy" decoding="async"></div>
      <div>
        <div class="ln">Amit Kochavi</div>
        <div class="lt">Chairman, CEO &amp; Founder</div>
        <div class="body-copy">
          <p>Amit founded Starwell Holdings to build a global private investment and operating company that combines long-term capital with operational execution.</p>
          <p>His career spans technology, real estate, and civic leadership. He is the founder of Doss Israel Ltd. and shareholder in Doss Inc., Senior Advisor to the Mayor of Sderot, and a member of President Herzog&rsquo;s &ldquo;Voice of the People&rdquo; initiative.</p>
          <p>Amit continues to grow Starwell&rsquo;s portfolio of platforms and partnerships, focused on building enduring value across cycles and geographies.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" id="partnership" data-reveal>
    <h2 class="serif" style="margin-bottom:20px">Partnership</h2>
    <p class="body-copy" style="margin:0 auto 12px;text-align:center;max-width:760px">We focus on selective, high-conviction investments where we can be thoughtful partners and long-term stewards of capital.</p>
    {partner_marquee}
  </section>
</div>

<section class="dark" id="legacy" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:24px"><h2 class="serif">Legacy</h2></div>
    <p class="body-copy" style="max-width:780px;margin:0 auto 54px;text-align:center">Starwell builds on four generations of entrepreneurship, capital stewardship, and public leadership.</p>
    <div class="legacy-row">
      <div class="lg-text">
        <p>The roots of this legacy trace back to Max Factor, the pioneering entrepreneur who transformed the global cosmetics industry and built one of the most enduring consumer brands of the 20th century through innovation, craftsmanship, and an uncompromising standard of excellence.</p>
      </div>
      <figure class="legacy-fig"><div class="ph-img portrait"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/0a8a8dcfb_max-factor-portrait.jpg" alt="Max Factor" loading="lazy" decoding="async"></div><figcaption>Max Factor</figcaption></figure>
    </div>
    <div class="legacy-row">
      <figure class="legacy-fig"><div class="ph-img portrait"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/9c712cf33_DavidHeyman.jpg" alt="David M. Heyman" loading="lazy" decoding="async"></div><figcaption>David M. Heyman</figcaption></figure>
      <div class="lg-text">
        <p>They also extend to David M. Heyman, a distinguished philanthropist and business leader whose work helped shape modern philanthropic institutions, with a lasting focus on education, community development, and long-term societal progress.</p>
      </div>
    </div>
    <div class="body-copy" style="max-width:820px;margin:8px auto 0;text-align:center">
      <p>In Israel, the legacy continued through the Buchman family, whose multi-generational involvement in business, real estate, and philanthropy contributed meaningfully to the country&rsquo;s economic development and social fabric. Across decades, the family combined disciplined capital allocation with a deep sense of responsibility to the communities in which they operated.</p>
      <p>Starwell is the modern expression of these roots &mdash; a capital platform and operational engine designed to create companies, develop real assets, and partner with exceptional operators. The underlying values remain constant: integrity, long-term ownership, and a responsibility to build things that endure.</p>
    </div>
  </div>
</section>'''
render("our-story.html","Our Story | Starwell Holdings",
  "Starwell Holdings is a privately held investment and operating company built to own and grow businesses over the long term, across real estate, operating companies, technology, and public markets.",
  our)

# =================== TECHNOLOGY ===================
tech=f'''<section class="hero">
  <div class="wrap">
    <h1>Starwell<br>Technologies</h1>
    <p class="lead">Acquiring control or significant equity in IT services companies in the Israeli lower middle market.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">Thesis</div>
    <p class="lede">Israel&rsquo;s IT services market is large, growing, and deeply fragmented. Most strong operators are independent &mdash; built on expertise and client trust, not institutional scale.</p>
    <div class="body-copy">
      <p>Starwell Technologies acquires control or significant equity in established, profitable IT services companies in the Israeli lower middle market. We partner with operators to preserve what works while building the infrastructure and discipline of a lasting platform.</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps">
      <div class="step"><div class="n">01</div><h3>Acquire</h3><p>Control or significant equity in profitable, established IT services companies operating in the Israeli lower middle market.</p></div>
      <div class="step"><div class="n">02</div><h3>Integrate</h3><p>Centralized systems, shared infrastructure, and standardized service delivery across the portfolio.</p></div>
      <div class="step"><div class="n">03</div><h3>Scale</h3><p>Operational improvements, talent development, and expanded service capabilities to drive long-term value creation.</p></div>
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
        <p>Residential and mixed-use development in Tel Aviv and central Israel, alongside institutional developers and public-sector partners. Focus on urban renewal and projects with structural demand tailwinds.</p>
      </div>
      <div class="market">
        <div class="ml">United States</div>
        <h3>Capital Allocation</h3>
        <p>Limited partner investments in value-add multifamily and industrial logistics strategies, alongside institutional operators with demonstrated track records.</p>
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
    <h1>Starwell<br>Capital</h1>
    <p class="lead">The capital allocation arm of Starwell Holdings &mdash; deploying capital across private equity, public markets, hedge funds, and real estate.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">Approach</div>
    <p class="lede">Patient, conviction-driven capital allocation across private equity, public markets, and alternative strategies.</p>
    <div class="body-copy">
      <p>Starwell Capital oversees the firm&rsquo;s external capital deployment. The mandate spans private equity with a focus on AI-enabled roll-ups, long-term public market holdings, allocations to long-strategy hedge funds, and real estate. We invest with a long time horizon and concentrate where we have genuine conviction.</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps four">
      <div class="step"><div class="n">01</div><h3>AI Roll-Ups</h3><p>Private equity investments in AI-native roll-up strategies acquiring and modernizing traditional service businesses at scale.</p></div>
      <div class="step"><div class="n">02</div><h3>Public Markets</h3><p>Long-term concentrated holdings in public companies where the firm has deep conviction in the business and management team.</p></div>
      <div class="step"><div class="n">03</div><h3>Hedge Funds</h3><p>Selective allocations to long-strategy hedge funds with differentiated process and consistent risk-adjusted performance.</p></div>
      <div class="step"><div class="n">04</div><h3>Real Estate</h3><p>Capital allocations to real estate funds and structures as part of a diversified long-term portfolio.</p></div>
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
# (cat, date, title, excerpt, source_url, image_url) — mirrors the live NewsArticle records
NEWS=[
 ('Real Estate','Dec 21, 2025','Lipa Meir to Rent Offices in Beyond Tower for 11 Million NIS Per Year',
  'Lipa Meir & Co. is leaving Amot Investments House in Tel Aviv to lease 7,000 sqm of office space across 4 floors in the Beyond Tower project from Tidhar, Union, and Himnuta.',
  'https://www.calcalist.co.il/real-estate/article/bjoi20k003','https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/c758ca080_--beyond---2.jpg'),
 ('Company News','Jun 3, 2025','Circles Merges Operations with U.S.-Based Doss',
  'Circles is merging its operations with U.S.-based Doss and will become the Israeli sales and marketing center for the company.',
  '','https://www.new-techeurope.com/wp-content/uploads/2025/06/Amit-Kochavi-e1748940333350.jpg'),
 ('Company News','May 29, 2025','חברת Circles מתמזגת עם Doss האמריקאית',
  'חברת Circles מתמזגת עם Doss האמריקאית ותהפוך למרכז הפיתוח הישראלי שלה. עמית כוכבי ימונה למנהל הפיתוח הגלובלי.',
  '','https://www.ittime.co.il/wp-content/uploads/2025/05/Amit-Cohavi-200x300.jpeg'),
 ('Real Estate','May 6, 2025','Lee & Associates – Atlanta Facilitates Sale of 28-Acre Industrial Site to Terminal Logistics',
  "Center Capital's IOS platform, Terminal Logistics, has acquired a 28-acre site in Gainesville, GA.",
  '','https://www.lee-associates.com/atlanta/wp-content/uploads/sites/77/2021/08/Lee-Associates-Atlanta-Logo-2021.png'),
 ('Real Estate','Sep 4, 2024','גבעתיים על הגובה: המגדל שהפך לגבוה בישראל',
  'פרויקט ביונד בגבעתיים חצה את גובה 240 המטרים והפך למגדל הגבוה בישראל. בסיום הבנייה יגיע לגובה 320 מטרים.',
  '','https://ynet-pic1.yit.co.il/cdn-cgi/image/f=auto,w=740,q=75/picserver5/crop_images/2024/09/04/SysC3IrnR/SysC3IrnR_0_0_1600_1067_0_x-large.jpg'),
 ('Real Estate','Sep 4, 2024','New Tower Claims Title of Tallest in Israel',
  'New tower in Givataim claims title of tallest in Israel, rising to 320 meters with office and residential space.',
  '','https://ynet-pic1.yit.co.il/cdn-cgi/image/format=auto/picserver5/crop_images/2024/09/03/S1v8iCV3A/S1v8iCV3A_0_113_460_820_0_x-large.jpg'),
 ('Real Estate','Nov 15, 2022','Meitar Leases 17 Floors in Givatayim Tower',
  'Meitar Law Offices leases 17 floors in Givatayim tower for NIS 54 million annually.',
  '','https://res.cloudinary.com/globes/image/upload/t_desktop_article_content_header_800%2A392/v1668451686/direct/%D7%94%D7%93%D7%9E%D7%99%D7%94_%D7%91%D7%99%D7%95%D7%A0%D7%93._%D7%A7%D7%A8%D7%93%D7%99%D7%98_-_%D7%A1%D7%98%D7%95%D7%93%D7%99%D7%95_84_2_003_nqik1n.jpg'),
]
cats=["All"]+list(dict.fromkeys(n[0] for n in NEWS))
pills="".join(f'<button class="pill{" active" if c=="All" else ""}" data-cat="{("all" if c=="All" else c)}">{c}</button>' for c in cats)
cards=""
for cat,date,title,blurb,src,img in NEWS:
    href=src or "#"
    tgt=' target="_blank" rel="noopener"' if src else ''
    media=f'<img src="{_esc(img)}" alt="{_esc(title)}" loading="lazy" decoding="async">' if img else cat
    cards+=f'''      <a class="na" data-cat="{_esc(cat)}" href="{_esc(href)}"{tgt}>
        <div class="ph-img">{media}</div>
        <div class="na-body">
          <div class="row1"><span class="cat">{_esc(cat)}</span><span class="date">{date}</span></div>
          <h3>{_esc(title)}</h3>
          <p>{_esc(blurb)}</p>
          <span class="link-arrow">Read More &rarr;</span>
        </div>
      </a>
'''
news=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">News</span>
    <h1>News &amp; Insights</h1>
    <p class="lead">Company news, market commentary, and updates on our investments.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="filters">{pills}</div>
    <div class="news-grid">
{cards}    </div>
  </section>
</div>'''
render("news.html","News | Starwell Holdings",
  "Company news, market commentary, and updates on Starwell Holdings investments and activities.",
  news,extra=live_script("news"))

# =================== CONTACT ===================
contact='''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Contact</span>
    <h1>Get in Touch</h1>
    <p class="lead">For inquiries about investment opportunities, partnerships, or potential transactions, please complete the form below. A member of our team will respond promptly.</p>
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
  "Contact Starwell Holdings about investment opportunities, partnerships, or potential transactions. Offices in Tel Aviv and Los Angeles.",
  contact)

# =================== CAREERS ===================
CAREER_VALUES=[
  ("Long-Term Thinking","We build for decades, not quarters. Every decision is made with durability and permanence in mind."),
  ("Operational Excellence","We get into the details. Great outcomes come from rigorous execution and deep domain knowledge."),
  ("Integrity","We say what we mean and do what we say — with partners, portfolio companies, and each other."),
  ("Entrepreneurial Spirit","We are builders. We back people who create things that didn’t exist before."),
]
value_cards="".join(f'      <div class="step"><h3>{t}</h3><p>{d}</p></div>\n' for t,d in CAREER_VALUES)
CAREER_CATS=["All","Technology","Real Estate","Capital & Investments","Operations","Finance"]
career_pills="".join(f'<button class="pill{" active" if c=="All" else ""}" data-cat="{("all" if c=="All" else c)}">{c}</button>' for c in CAREER_CATS)
careers=f'''<section class="hero hero-center">
  <div class="wrap">
    <span class="eyebrow">Join Us</span>
    <h1>Careers at Starwell</h1>
    <p class="lead" style="margin-left:auto;margin-right:auto">We&rsquo;re a small, high-conviction team building platforms across technology, real estate, and capital markets. We look for people who think long-term and operate with precision.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" data-reveal>
    <h2 class="serif" style="margin-bottom:44px">How We Work</h2>
    <div class="steps four" style="text-align:left">
{value_cards}    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec sec-center">
    <h2 class="serif" style="margin-bottom:8px">Open Positions</h2>
    <p class="body-copy" style="margin:0 auto 34px">Click any role to learn more and apply.</p>
    <div class="filters" style="justify-content:center">{career_pills}</div>
    <div id="positions" style="text-align:left;max-width:760px;margin:0 auto"></div>
    <p class="body-copy" id="posEmpty" style="margin:40px auto 0">No open positions in this category at the moment. Check back soon or reach out directly at <a href="mailto:careers@starwellholdings.com" class="link-arrow on-dark">careers@starwellholdings.com</a>.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" data-reveal>
    <h2 class="serif" style="margin-bottom:14px">Don&rsquo;t see the right role?</h2>
    <p class="body-copy" style="margin:0 auto 28px">We&rsquo;re always interested in meeting exceptional people. Send us a note and tell us how you&rsquo;d contribute.</p>
    <a href="mailto:careers@starwellholdings.com" class="btn">Get in Touch</a>
  </section>
</div>'''
render("careers.html","Careers | Starwell Holdings",
  "Careers at Starwell Holdings. We're a small, high-conviction team building platforms across technology, real estate, and capital markets.",
  careers,extra=live_script("careers"))

# =================== SITEMAP (human) ===================
sm='''<section class="hero hero-center">
  <div class="wrap">
    <h1>Sitemap</h1>
  </div>
</section>
<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sitemap-cols">
      <div><h4>Company</h4>
        <a href="index.html">Home</a><a href="our-story.html">Our Story</a>
        <a href="news.html">News</a><a href="contact.html">Contact</a><a href="careers.html">Careers</a></div>
      <div><h4>Core Activities</h4>
        <a href="technology.html">Technology</a><a href="capital.html">Capital</a>
        <a href="real-estate.html">Real Estate</a></div>
      <div><h4>Other</h4>
        <a href="sitemap.html">Sitemap</a></div>
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
# Private pages (hq, wealth-portal, dashboard) are intentionally NOT listed
# here. Listing them in robots.txt would advertise their URLs, and a
# Disallow would actually PREVENT Google from reading their "noindex"
# directive (a disallowed page can still be indexed if discovered). Instead
# they carry a noindex meta tag AND an X-Robots-Tag: noindex header
# (see netlify.toml), which is the authoritative way to keep them out of search.
open(os.path.join(OUT,"robots.txt"),"w").write(
  "User-agent: *\nAllow: /\n\nSitemap: "+BASE+"/sitemap.xml\n")
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

[[headers]]
  for = "/hq.html"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"

[[headers]]
  for = "/hq"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"

[[headers]]
  for = "/wealth-portal.html"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"

[[headers]]
  for = "/wealth-portal"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"

[[headers]]
  for = "/dashboard.html"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"

[[headers]]
  for = "/dashboard"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"
''')
open(os.path.join(OUT,"vercel.json"),"w").write(json.dumps({
  "cleanUrls":False,"trailingSlash":False,
  "headers":[
    {"source":"/(.*)","headers":[
      {"key":"X-Content-Type-Options","value":"nosniff"},
      {"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"}]},
    {"source":"/(hq|wealth-portal|dashboard).html","headers":[
      {"key":"X-Robots-Tag","value":"noindex, nofollow, noarchive, nosnippet"}]}]},indent=2))
print("PAGES BUILT")
print(sorted(os.listdir(OUT)))
