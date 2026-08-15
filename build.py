#!/usr/bin/env python3
import json, os, re
import html as _html
OUT=os.environ.get("STARWELL_OUT", os.path.dirname(os.path.abspath(__file__)))
BASE="https://starwellholdings.com"
CSS=open(os.path.join(OUT,"styles.css")).read()
JS=open(os.path.join(OUT,"script.js")).read()

# ---- Supabase (public, read-only): lets the live site show content edited
# in the HQ dashboard. The anon key is public by design; writes are blocked by
# Row-Level Security. Leave blank to keep the site fully static (baked content).
SB_URL=os.environ.get("STARWELL_SB_URL","https://leozizmosbwhwfkzoovt.supabase.co")
SB_ANON=os.environ.get("STARWELL_SB_ANON","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlb3ppem1vc2J3aHdma3pvb3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQ3MjQsImV4cCI6MjA5Nzg2MDcyNH0.eFb8e5a4x09QYYFHZ1ER23v5bzie8WJz6ZLdsfrcd6s")

# ---- bilingual scaffolding ---------------------------------------------------
# A single source builds both the English site (at the root) and the Hebrew site
# (under /he/). t(en, he) picks the right string for the language being built.
LANGS=["en","he"]
LANG="en"
def t(en,he): return he if LANG=="he" else en
def ap(): return "../" if LANG=="he" else ""          # asset path prefix for /he/ pages
def out_path(filename): return os.path.join(OUT,"he",filename) if LANG=="he" else os.path.join(OUT,filename)

def live_script(kind):
    if not (SB_URL and SB_ANON): return ""
    sdk='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    body=open(os.path.join(OUT,"assets","live-"+kind+".js")).read()
    cfg=f'window.SB_URL={json.dumps(SB_URL)};window.SB_ANON={json.dumps(SB_ANON)};'
    return f'{sdk}\n<script>{cfg}\n{body}</script>'

# ---- shared chrome ----
def lang_href(cur):
    # link to the SAME page in the other language (clean URL, no .html)
    slug="" if cur=="index.html" else cur[:-5]
    return ("he/"+slug) if LANG=="en" else ("../"+slug)
def DESK_NAV(cur):
    return f'''  <div class="nav-item"><a href="{t("/","/he/")}">{t("Home","ראשי")}</a></div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">{t("About Us","אודות")} <span class="chev"></span></button>
    <div class="dropdown">
      <a href="our-story">{t("About Us","אודות")}</a>
      <a href="our-history">{t("Our History","ההיסטוריה שלנו")}</a>
      <a href="our-team">{t("Our Team","הצוות שלנו")}</a>
      <a href="news">{t("News","חדשות")}</a>
    </div>
  </div>
  <div class="nav-item">
    <button class="nav-trigger" aria-haspopup="true">{t("What We Do","מה אנחנו עושים")} <span class="chev"></span></button>
    <div class="dropdown">
      <a href="technology">{t("IT Services","שירותי IT")}</a>
      <a href="real-estate">{t("Real Estate","נדל&quot;ן")}</a>
      <a href="capital">{t("Capital","קפיטל")}</a>
    </div>
  </div>
  <div class="nav-item"><a href="contact">{t("Contact","צור קשר")}</a></div>
  <div class="nav-item nav-lang"><a href="{lang_href(cur)}" hreflang="{t("he","en")}" aria-label="{t("עברית","English")}">{t("עברית","EN")}</a></div>
  <div class="nav-item"><button class="nav-searchbtn" id="searchToggle" aria-label="{t("Search","חיפוש")}" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button></div>'''

def MOBILE_NAV(cur):
    return f'''<div class="mmenu" id="mmenu" aria-hidden="true">
  <div class="mmenu-top"><button class="mclose" id="mclose" aria-label="{t("Close menu","סגור תפריט")}">&times;</button></div>
  <div class="mlist">
    <form class="msearch" action="search" method="get" role="search">
      <input type="search" name="q" placeholder="{t("Search Starwell","חיפוש בסטארוול")} …" aria-label="{t("Search","חיפוש")}" autocomplete="off">
    </form>
    <a class="mlink" href="{t("/","/he/")}">{t("Home","ראשי")}</a>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">{t("About Us","אודות")} <span class="mchev"></span></button>
      <div class="msub">
        <a href="our-story">{t("About Us","אודות")}</a>
        <a href="our-history">{t("Our History","ההיסטוריה שלנו")}</a>
        <a href="our-team">{t("Our Team","הצוות שלנו")}</a>
        <a href="news">{t("News","חדשות")}</a>
      </div>
    </div>
    <div class="mgroup">
      <button class="mlink" aria-expanded="false">{t("What We Do","מה אנחנו עושים")} <span class="mchev"></span></button>
      <div class="msub">
        <a href="technology">{t("IT Services","שירותי IT")}</a>
        <a href="real-estate">{t("Real Estate","נדל&quot;ן")}</a>
        <a href="capital">{t("Capital","קפיטל")}</a>
      </div>
    </div>
    <a class="mlink" href="contact">{t("Contact","צור קשר")}</a>
    <a class="mlink" href="{lang_href(cur)}" hreflang="{t("he","en")}">{t("עברית","English")}</a>
  </div>
</div>'''

def header(cur):
    return f'''<a href="#main" class="skip-link">{t("Skip to content","דלג לתוכן")}</a>
<header class="nav">
  <div class="wrap nav-in">
    <a href="{t("/","/he/")}" class="brand" aria-label="{t("Starwell Holdings home","סטארוול הולדינגס - דף הבית")}">
      <span class="brand-word">Starwell Holdings</span>
    </a>
    <nav class="nav-links" aria-label="{t("Primary","ראשי")}">
{DESK_NAV(cur)}
    </nav>
    <button class="burger" id="burger" aria-label="{t("Open menu","פתח תפריט")}" aria-expanded="false" aria-controls="mmenu"><span></span><span></span><span></span></button>
  </div>
  <div class="site-search" id="siteSearch" hidden>
    <form class="wrap" action="search" method="get" role="search">
      <input type="search" name="q" id="siteSearchInput" placeholder="{t("Search Starwell","חיפוש בסטארוול")} …" aria-label="{t("Search","חיפוש")}" autocomplete="off">
      <button type="submit" class="ss-go" aria-label="{t("Search","חיפוש")}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
      <button type="button" class="ss-close" id="searchClose" aria-label="{t("Close search","סגור חיפוש")}">&times;</button>
    </form>
  </div>
</header>
{MOBILE_NAV(cur)}'''

def FOOTER():
    return f'''<footer class="site">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <div class="brand foot-lockup"><span class="brand-word" style="font-size:27px">Starwell Holdings</span></div>
        <p>{t("A private holding company with operating activities in IT services and real estate, alongside passive capital allocation to public markets and alternative assets.","חברת החזקות פרטית, עם פעילות תפעולית בתחומי שירותי ה-IT והנדל&quot;ן, ולצדה הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים.")}</p>
      </div>
      <div class="foot-col">
        <h4>{t("Company","החברה")}</h4>
        <a href="our-story">{t("About Us","אודות")}</a>
        <a href="our-history">{t("Our History","ההיסטוריה שלנו")}</a>
        <a href="our-team">{t("Our Team","הצוות שלנו")}</a>
        <a href="news">{t("News","חדשות")}</a>
        <a href="careers">{t("Careers","קריירה")}</a>
      </div>
      <div class="foot-col">
        <h4>{t("What We Do","מה אנחנו עושים")}</h4>
        <a href="technology">{t("IT Services","שירותי IT")}</a>
        <a href="real-estate">{t("Real Estate","נדל&quot;ן")}</a>
        <a href="capital">{t("Capital","קפיטל")}</a>
      </div>
      <div class="foot-col">
        <h4>{t("Get in Touch","יצירת קשר")}</h4>
        <a href="contact">{t("Contact","צור קשר")}</a>
        <a href="https://www.linkedin.com/company/starwell-holdings/" target="_blank" rel="noopener">LinkedIn</a>
        <a href="{t("/sitemap","/he/sitemap")}">{t("Sitemap","מפת אתר")}</a>
        <a href="{t("he/","../")}" hreflang="{t("he","en")}">{t("עברית","English")}</a>
      </div>
    </div>
    <div class="foot-bot">
      <span>&copy; 2026 Starwell Holdings. {t("All Rights Reserved.","כל הזכויות שמורות.")}</span>
      <a href="#top" class="totop" aria-label="{t("Back to top","חזרה למעלה")}">&uarr;</a>
    </div>
  </div>
</footer>'''

def ORG_LD():
    return {"@context":"https://schema.org","@type":"Organization","@id":BASE+"/#organization",
      "name":"Starwell Holdings","alternateName":["Starwell","סטארוול הולדינגס","סטארוול"],"legalName":"Starwell Holdings",
      "url":BASE+"/","logo":{"@type":"ImageObject","url":BASE+"/assets/icon-512.png","width":512,"height":512},
      "image":BASE+"/assets/og-image.png",
      "description":t("Starwell Holdings is a private holding company with operating activities in IT services and real estate, alongside passive capital allocation to public markets and alternative assets.",
                      "סטארוול הולדינגס היא חברת החזקות פרטית, עם פעילות תפעולית בתחומי שירותי ה-IT והנדל\"ן, ולצדה הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים."),
      "foundingDate":"2025","address":{"@type":"PostalAddress","addressLocality":"Tel Aviv","addressCountry":"IL"},
      "founder":{"@type":"Person","@id":BASE+"/our-team.html#amit-kochavi","name":"Amit Kochavi","alternateName":"עמית כוכבי"},
      "contactPoint":{"@type":"ContactPoint","url":BASE+"/contact.html","contactType":"investor relations"},
      "sameAs":["https://www.linkedin.com/company/starwell-holdings/"]}

def NAV_LD():
    # Primary navigation as structured data (language-aware) so search engines
    # read the same site structure on the Hebrew pages as on the English ones.
    pfx=BASE+t("","/he")
    items=[(t("About Us","אודות"),"/our-story"),(t("Our Team","הצוות שלנו"),"/our-team"),
           (t("IT Services","שירותי IT"),"/technology"),(t("Real Estate","נדל\"ן"),"/real-estate"),
           (t("Capital","קפיטל"),"/capital"),(t("News","חדשות"),"/news"),
           (t("Careers","קריירה"),"/careers"),(t("Contact","צור קשר"),"/contact")]
    return {"@context":"https://schema.org","@type":"ItemList","@id":pfx+"/#nav",
      "name":t("Primary navigation","ניווט ראשי"),
      "itemListElement":[{"@type":"SiteNavigationElement","position":i+1,"name":n,"url":pfx+u} for i,(n,u) in enumerate(items)]}

# ---- client-side search index (built while pages render) -------------------
SEARCH_INDEX={"en":[],"he":[]}
def strip_html(s):
    s=re.sub(r'<(script|style)[\s\S]*?</\1>',' ',s)
    s=re.sub(r'<[^>]+>',' ',s)
    s=_html.unescape(s)
    return re.sub(r'\s+',' ',s).strip()

def render(filename,title,desc,body,extra_ld=None,index=True,extra="",search=True):
    title=title.replace(" - "," | ")
    slug="" if filename=="index.html" else filename[:-5]
    en_url=BASE+"/"+slug
    he_url=BASE+"/he/"+slug
    canonical=he_url if LANG=="he" else en_url
    robots="index, follow, max-image-preview:large, max-snippet:-1" if index else "noindex, follow"
    lds=[ORG_LD(),NAV_LD()]+([extra_ld] if extra_ld else [])
    ld="\n".join('<script type="application/ld+json">'+json.dumps(l,ensure_ascii=False)+'</script>' for l in lds)
    htmltag=t('<html lang="en">','<html lang="he" dir="rtl">')
    oglocale=t("en_US","he_IL")
    # Hebrew pages load a Hebrew-capable webfont in addition to the Latin display face.
    he_font=('<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">'
             if LANG=="he" else "")
    hreflang=(f'<link rel="alternate" hreflang="en" href="{en_url}">\n'
              f'<link rel="alternate" hreflang="he" href="{he_url}">\n'
              f'<link rel="alternate" hreflang="x-default" href="{en_url}">')
    P=ap()
    html=f'''<!DOCTYPE html>
{htmltag}
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
{hreflang}
<meta name="theme-color" content="#0B0B0F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Starwell Holdings">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="{oglocale}">
<meta property="og:locale:alternate" content="{t("he_IL","en_US")}">
<meta property="og:image" content="{BASE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{BASE}/assets/og-image.png">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230F0F12'/%3E%3Ctext x='50' y='50' dy='.35em' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='62' fill='%23F4F3F0'%3ES%3C/text%3E%3C/svg%3E">
<link rel="icon" type="image/png" sizes="32x32" href="{P}assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="512x512" href="{P}assets/icon-512.png">
<link rel="apple-touch-icon" href="{P}assets/apple-touch-icon.png">
<link rel="manifest" href="{P}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600;6..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
{he_font}
{ld}
<style>
{CSS}
</style>
</head>
<body id="top">
{header(filename)}
<main id="main">
{body}
</main>
{FOOTER()}
<script>
{JS}
</script>
{extra}
</body>
</html>'''
    if search:
        txt=strip_html(body)
        SEARCH_INDEX[LANG].append({"url":("." if filename=="index.html" else filename[:-5]),"title":title.split(" | ")[0],"text":txt[:2400]})
    open(out_path(filename),"w").write(html)

# ---- portfolio data (shared with the dashboard) ----
import html as _html
PORTFOLIO=json.load(open(os.path.join(OUT,"data","portfolio.json"),encoding="utf-8"))
def _esc(s): return _html.escape(s or "",quote=True)
def _chip(e):
    if e.get("logo"):
        return f'<img src="{e["logo"]}" alt="{_esc(e["name"])} logo" loading="lazy" decoding="async" style="max-height:34px;max-width:120px;object-fit:contain">'
    return f'<span>{_esc(e.get("logoText") or e["name"])}</span>'
def _web(e):
    u=e.get("website")
    if not u: return ''
    href=u if u not in (True,"true") else '#'
    return f'<a href="{_esc(href)}" target="_blank" rel="noopener" class="link-arrow on-dark" style="font-size:13px">{t("Website","אתר")} &rarr;</a>'
def pf_from(e):
    role=f'<div class="meta"><span>{t("Role","תפקיד")}: {_esc(e.get("role"))}</span></div>' if e.get("role") else ''
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
    if not items: return f'      <p style="color:var(--on-panel-soft)">{t("No entries yet.","אין רשומות עדיין.")}</p>'
    fn=xp_from if pillar=="real-estate" else pf_from
    return "\n".join(fn(e) for e in items)
def highlights():
    items=[e for e in PORTFOLIO if e.get("highlight")]
    if not items: items=PORTFOLIO[:2]
    items.sort(key=lambda e:e.get("highlightOrder",99))
    return "\n".join((xp_from(e) if e.get("pillar")=="real-estate" else pf_from(e)) for e in items)

# Partner marquee (shared across languages - brand logos)
SB="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/"
PARTNERS=[
  ("Tidhar", SB+"ed0e4f174_5aae560d-4622-4639-9a90-a4dc20483398.jpg"),
  ("Union Group", SB+"d4e85ea44_images2.png"),
  ("Center Capital", SB+"c020e8ecf_centercaplog.png"),
  ("Wilpon & Co.", SB+"74d15b488_wilpon.png"),
  ("Noked Capital", SB+"0b7882a5e_Screenshot2025-12-20at095550.png"),
  ("Hazavim", SB+"7198da834_logo-black-new.png"),
]
def _pset(hidden):
    hid=' aria-hidden="true"' if hidden else ''
    return "".join(
        f'<span class="m-logo"><img src="{u}" alt="{_esc(n)}" loading="lazy" decoding="async"{hid}></span>'
        for n,u in PARTNERS)

# News list (baked fallback; live Supabase data overrides on the news page)
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

CAREER_VALUES=[
  ("Long-Term Thinking","חשיבה לטווח ארוך","We build for decades, not quarters. Every decision is made with durability and permanence in mind.",
   "אנחנו בונים לעשורים, לא לרבעונים. כל החלטה מתקבלת מתוך מחשבה על יציבות וקיימוּת."),
  ("Operational Excellence","מצוינות תפעולית","We get into the details. Great outcomes come from rigorous execution and deep domain knowledge.",
   "אנחנו יורדים לפרטים. תוצאות מצוינות נובעות מביצוע קפדני ומידע מעמיק בתחום."),
  ("Integrity","יושרה","We say what we mean and do what we say - with partners, portfolio companies, and each other.",
   "אנחנו אומרים את מה שאנו מתכוונים ועושים את מה שאמרנו - מול שותפים, חברות פורטפוליו וזה מול זה."),
  ("Entrepreneurial Spirit","רוח יזמית","We are builders. We back people who create things that didn’t exist before.",
   "אנחנו בונים. אנחנו תומכים באנשים שיוצרים דברים שלא היו קיימים קודם."),
]

# =============================================================================
# Build both languages from one source.
# =============================================================================
def build_site():
    # =================== HOME ===================
    home=f'''<section class="hero hero-home">
  <div class="wrap">
    <h1>{t("Dream with Starwell.","חולמים עם סטארוול.")}</h1>
    <p class="lead">{t("Starwell Holdings is a private holding company with operating activities in IT services and real estate, alongside passive capital allocation to public markets and alternative assets.","סטארוול הולדינגס היא חברת החזקות פרטית, עם פעילות תפעולית בתחומי שירותי ה-IT והנדל&quot;ן, ולצדה הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים.")}</p>
    <a href="#what-we-do" class="scrolldown" aria-label="{t("Scroll down","גלול למטה")}">&darr;</a>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" id="what-we-do" data-reveal>
    <h2 class="serif">{t("What We Do","מה אנחנו עושים")}</h2>
  </section>
</div>
<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="cards">
      <div class="card">
        <h3>{t("IT Services","שירותי IT")}</h3>
        <p>{t("Acquiring and operating IT Services businesses.","רכישה ותפעול של עסקי שירותי IT.")}</p>
        <a href="technology" class="link-arrow">{t("Learn More","קראו עוד")} &rarr;</a>
      </div>
      <div class="card">
        <h3>{t("Real Estate","נדל&quot;ן")}</h3>
        <p>{t("Development and GP investments in Israel, select co-investments.","ייזום והשקעות שותף כללי (GP) בישראל, לצד השקעות משותפות נבחרות.")}</p>
        <a href="real-estate" class="link-arrow">{t("Learn More","קראו עוד")} &rarr;</a>
      </div>
      <div class="card">
        <h3>{t("Capital","קפיטל")}</h3>
        <p>{t("Long-term investment portfolio across public markets and direct private positions.","תיק השקעות לטווח ארוך בשווקים הציבוריים ובפוזיציות פרטיות ישירות.")}</p>
        <a href="capital" class="link-arrow">{t("Learn More","קראו עוד")} &rarr;</a>
      </div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec sec-center">
    <span class="eyebrow" style="color:var(--on-panel-soft)">{t("About Starwell","אודות סטארוול")}</span>
    <h2 class="serif" style="margin:14px 0 16px">{t("Learn more about Starwell","הכירו את סטארוול")}</h2>
    <p class="body-copy" style="max-width:680px;margin:0 auto 32px;color:var(--on-panel-soft)">{t("Starwell Holdings is a private holding company with operating activities in IT services and real estate, alongside passive capital allocation to public markets and alternative assets - a long-term, operator-led approach.","סטארוול הולדינגס היא חברת החזקות פרטית, עם פעילות תפעולית בתחומי שירותי ה-IT והנדל&quot;ן, ולצדה הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים - בגישה ארוכת-טווח ומובלת-מפעיל.")}</p>
    <a href="our-story" class="btn btn-light">{t("Learn more about Starwell","הכירו את סטארוול")} &rarr;</a>
  </div>
</section>'''
    render("index.html",
      t("Starwell Holdings | Private Investment & Operating Company","סטארוול הולדינגס | חברת השקעות ותפעול פרטית"),
      t("Starwell Holdings is a private holding company with operating activities in IT services and real estate, alongside passive capital allocation to public markets and alternative assets.",
        "סטארוול הולדינגס היא חברת החזקות פרטית, עם פעילות תפעולית בתחומי שירותי ה-IT והנדל\"ן, ולצדה הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים."),
      home,extra_ld={"@context":"https://schema.org","@type":"WebSite","@id":BASE+"/#website",
        "name":"Starwell Holdings","alternateName":"Starwell","url":BASE+"/",
        "inLanguage":t("en","he"),"publisher":{"@id":BASE+"/#organization"},
        "potentialAction":{"@type":"SearchAction",
          "target":{"@type":"EntryPoint","urlTemplate":BASE+t("","/he")+"/search.html?q={search_term_string}"},
          "query-input":"required name=search_term_string"}})

    # =================== OUR STORY ===================
    partner_marquee=f'''<div class="marquee" aria-label="{t("Selected partners","שותפים נבחרים")}">
      <div class="marquee-track">{_pset(False)}{_pset(True)}</div>
    </div>'''
    our=f'''<section class="hero hero-center">
  <div class="wrap">
    <h1>{t("About Us","אודות")}</h1>
  </div>
</section>

<div class="wrap">
  <section class="sec" id="about" data-reveal>
    <div class="sec-center" style="margin-bottom:34px"><h2 class="serif">Starwell Holdings</h2></div>
    <div class="body-copy" style="max-width:880px;margin:0 auto;text-align:center;font-size:16px">
      <p>{t("Starwell Holdings is a global private investment and operating company. We invest and build across real estate, operating businesses, alternative investments, and public markets.","סטארוול הולדינגס היא חברת השקעות ותפעול גלובלית פרטית. אנחנו משקיעים ובונים בתחומי הנדל&quot;ן, עסקים תפעוליים, השקעות אלטרנטיביות והשווקים הציבוריים.")}</p>
      <p>{t("Beyond capital allocation, Starwell acts as a long-term owner and active partner - founding companies, scaling platforms, and working alongside management teams to develop durable businesses and real assets. Our approach combines entrepreneurial execution with disciplined investment principles.","מעבר להקצאת הון, סטארוול פועלת כבעלים לטווח ארוך וכשותפה פעילה - מקימה חברות, מרחיבה פלטפורמות ועובדת לצד צוותי ההנהלה כדי לפתח עסקים ונכסים בני-קיימא. הגישה שלנו משלבת ביצוע יזמי עם עקרונות השקעה ממושמעים.")}</p>
      <p>{t("We focus on opportunities where long-term thinking, operational involvement, and strategic alignment can create enduring value across cycles and generations.","אנחנו מתמקדים בהזדמנויות שבהן חשיבה לטווח ארוך, מעורבות תפעולית והלימה אסטרטגית יכולות לייצר ערך מתמשך לאורך מחזורי שוק ודורות.")}</p>
      <p>{t("Starwell Holdings was founded by Amit Kochavi, who serves as Chairman and CEO.","סטארוול הולדינגס נוסדה על ידי עמית כוכבי, המכהן כיו&quot;ר וכמנכ&quot;ל.")} <a href="our-team">{t("Meet the team","הכירו את הצוות")} &rarr;</a></p>
    </div>
  </section>
</div>

<section class="dark" id="business-focus" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:18px"><h2 class="serif">{t("Business Focus","תחומי פעילות")}</h2></div>
    <div class="body-copy" style="max-width:780px;margin:0 auto 50px;text-align:center">
      <p>{t("Starwell focuses on building and investing in businesses and assets where long-term ownership, active involvement, and disciplined execution drive sustainable value.","סטארוול מתמקדת בבנייה ובהשקעה בעסקים ובנכסים שבהם בעלוּת לטווח ארוך, מעורבות פעילה וביצוע ממושמע מניבים ערך בר-קיימא.")}</p>
      <p>{t("Our activities span four core areas:","הפעילות שלנו משתרעת על פני ארבעה תחומי ליבה:")}</p>
    </div>
    <div class="steps four">
      <div class="step"><h3>{t("Real Estate","נדל&quot;ן")}</h3><p>{t("We invest in, develop, and operate residential, commercial, and mixed-use assets, partnering with experienced operators and taking an owner-led approach to development, asset management, and value creation.","אנחנו משקיעים, מייזמים ומפעילים נכסי מגורים, מסחר ושימושים מעורבים, בשותפות עם מפעילים מנוסים ובגישה מובלת-בעלים לייזום, ניהול נכסים ויצירת ערך.")}</p></div>
      <div class="step"><h3>{t("Operating Businesses","עסקים תפעוליים")}</h3><p>{t("Starwell builds and scales operating companies alongside strong management teams, with a focus on businesses that benefit from strategic guidance, operational improvement, and long-term capital support.","סטארוול בונה ומרחיבה חברות תפעוליות לצד צוותי ניהול חזקים, תוך התמקדות בעסקים שנהנים מהכוונה אסטרטגית, שיפור תפעולי ותמיכה הונית לטווח ארוך.")}</p></div>
      <div class="step"><h3>{t("Technology &amp; Innovation","טכנולוגיה וחדשנות")}</h3><p>{t("We back and help build technology-enabled platforms, with particular emphasis on applied technology, AI-driven solutions, and businesses that enhance traditional industries through innovation.","אנחנו תומכים ומסייעים בבניית פלטפורמות מבוססות טכנולוגיה, בדגש על טכנולוגיה יישומית, פתרונות מבוססי בינה מלאכותית ועסקים המשדרגים תעשיות מסורתיות באמצעות חדשנות.")}</p></div>
      <div class="step"><h3>{t("Public Markets &amp; Alternatives","שווקים ציבוריים ואלטרנטיבי")}</h3><p>{t("We allocate capital across public equities and alternative investments with a long-term, fundamentals-driven mindset, complementing our private market and operating activities.","אנחנו מקצים הון במניות ציבוריות ובהשקעות אלטרנטיביות בגישה ארוכת-טווח מבוססת פונדמנטלס, המשלימה את פעילותנו בשוק הפרטי ובתחום התפעולי.")}</p></div>
    </div>
    <p class="body-copy" style="max-width:780px;margin:50px auto 0;text-align:center">{t("Across all areas, Starwell prioritizes conviction-led investments, alignment with partners, and a hands-on approach that reflects our belief in building enduring value over time.","בכל התחומים, סטארוול מעדיפה השקעות מובלות-שכנוע, הלימה עם שותפים וגישה מעורבת המשקפת את אמונתנו בבניית ערך מתמשך לאורך זמן.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" id="strategy" data-reveal>
    <h2 class="serif" style="margin-bottom:20px">{t("Strategy","אסטרטגיה")}</h2>
    <p class="body-copy" style="margin:0 auto;text-align:center;max-width:760px">{t("Our approach combines long-term, disciplined capital with an operator&rsquo;s mindset. We prioritize value creation through active engagement and strategic guidance.","הגישה שלנו משלבת הון ממושמע לטווח ארוך עם חשיבה של מפעיל. אנחנו מעדיפים יצירת ערך באמצעות מעורבות פעילה והכוונה אסטרטגית.")}</p>
  </section>
</div>

<div class="wrap">
  <section class="sec sec-center" id="partnership" data-reveal>
    <h2 class="serif" style="margin-bottom:20px">{t("Partnership","שותפויות")}</h2>
    <p class="body-copy" style="margin:0 auto 12px;text-align:center;max-width:760px">{t("We focus on selective, high-conviction investments where we can be thoughtful partners and long-term stewards of capital.","אנחנו מתמקדים בהשקעות סלקטיביות ומובלות-שכנוע, שבהן נוכל להיות שותפים מעמיקים ונאמני הון לטווח ארוך.")}</p>
    {partner_marquee}
  </section>
</div>

<div class="wrap">
  <section class="sec sec-center" data-reveal>
    <span class="eyebrow">{t("More about Starwell","עוד על סטארוול")}</span>
    <h2 class="serif" style="margin:8px 0 12px">{t("Learn about our history and our team","הכירו את ההיסטוריה והצוות שלנו")}</h2>
    <p class="body-copy" style="margin:0 auto 34px;text-align:center;max-width:640px">{t("The roots we build on, and the people building enduring value across our platforms.","השורשים שעליהם אנחנו נשענים, והאנשים הבונים ערך מתמשך על פני הפלטפורמות שלנו.")}</p>
    <div class="steps two" style="text-align:left">
      <a class="step" href="our-history" style="text-decoration:none;color:inherit;display:block"><h3>{t("Our History","ההיסטוריה שלנו")}</h3><p>{t("Four generations of entrepreneurship, capital stewardship, and public leadership - from Max Factor to the Buchman family.","ארבעה דורות של יזמות, נאמנות הונית ומנהיגות ציבורית - ממקס פקטור ועד משפחת בוכמן.")}</p><span class="link-arrow" style="margin-top:14px">{t("Read our history","קראו את ההיסטוריה")} &rarr;</span></a>
      <a class="step" href="our-team" style="text-decoration:none;color:inherit;display:block"><h3>{t("Our Team","הצוות שלנו")}</h3><p>{t("Meet the people leading Starwell across IT Services, Real Estate, and alternative assets.","הכירו את האנשים המובילים את סטארוול בתחומי שירותי ה-IT, הנדל&quot;ן והנכסים האלטרנטיביים.")}</p><span class="link-arrow" style="margin-top:14px">{t("Meet the team","הכירו את הצוות")} &rarr;</span></a>
    </div>
  </section>
</div>'''
    render("our-story.html",
      t("About Us | Starwell Holdings","אודות | סטארוול הולדינגס"),
      t("Starwell Holdings is a privately held investment and operating company built to own and grow businesses over the long term, across real estate, operating companies, technology, and public markets.",
        "סטארוול הולדינגס היא חברת השקעות ותפעול פרטית שנבנתה כדי להחזיק ולהצמיח עסקים לטווח ארוך, בתחומי הנדל\"ן, חברות תפעוליות, טכנולוגיה ושווקים ציבוריים."),
      our)

    # =================== OUR HISTORY (Legacy) ===================
    history=f'''<section class="hero hero-center">
  <div class="wrap">
    <h1>{t("Our History","ההיסטוריה שלנו")}</h1>
  </div>
</section>

<section class="dark" id="legacy" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:24px"><h2 class="serif">{t("Legacy","מורשת")}</h2></div>
    <p class="body-copy" style="max-width:780px;margin:0 auto 54px;text-align:center">{t("Starwell builds on four generations of entrepreneurship, capital stewardship, and public leadership.","סטארוול נשענת על ארבעה דורות של יזמוּת, נאמנות הונית ומנהיגות ציבורית.")}</p>
    <div class="legacy-row">
      <div class="lg-text">
        <p>{t("The roots of this legacy trace back to Max Factor, the pioneering entrepreneur who transformed the global cosmetics industry and built one of the most enduring consumer brands of the 20th century through innovation, craftsmanship, and an uncompromising standard of excellence.","שורשי המורשת הזו נטועים במקס פקטור, היזם פורץ הדרך ששינה את תעשיית הקוסמטיקה העולמית ובנה את אחד ממותגי הצריכה המתמשכים ביותר של המאה ה-20 באמצעות חדשנות, אומנות וסטנדרט מצוינות בלתי מתפשר.")}</p>
      </div>
      <figure class="legacy-fig"><div class="ph-img portrait"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/0a8a8dcfb_max-factor-portrait.jpg" alt="{t("Max Factor","מקס פקטור")}" loading="lazy" decoding="async"></div><figcaption>{t("Max Factor","מקס פקטור")}</figcaption></figure>
    </div>
    <div class="legacy-row">
      <figure class="legacy-fig"><div class="ph-img portrait"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/9c712cf33_DavidHeyman.jpg" alt="{t("David M. Heyman","דיוויד מ. היימן")}" loading="lazy" decoding="async"></div><figcaption>{t("David M. Heyman","דיוויד מ. היימן")}</figcaption></figure>
      <div class="lg-text">
        <p>{t("They also extend to David M. Heyman, a distinguished philanthropist and business leader whose work helped shape modern philanthropic institutions, with a lasting focus on education, community development, and long-term societal progress.","היא נמשכת גם אל דיוויד מ. היימן, פילנתרופ ואיש עסקים נודע שפועלו סייע לעצב מוסדות פילנתרופיים מודרניים, עם מיקוד מתמשך בחינוך, בפיתוח קהילתי ובקדמה חברתית ארוכת-טווח.")}</p>
      </div>
    </div>
    <div class="body-copy" style="max-width:820px;margin:8px auto 0;text-align:center">
      <p>{t("In Israel, the legacy continued through the Buchman family, whose multi-generational involvement in business, real estate, and philanthropy contributed meaningfully to the country&rsquo;s economic development and social fabric. Across decades, the family combined disciplined capital allocation with a deep sense of responsibility to the communities in which they operated.","בישראל המשיכה המורשת דרך משפחת בוכמן, שמעורבותה הרב-דורית בעסקים, בנדל&quot;ן ובפילנתרופיה תרמה רבות לפיתוח הכלכלי ולמרקם החברתי של המדינה. לאורך עשורים שילבה המשפחה הקצאת הון ממושמעת עם תחושת אחריות עמוקה לקהילות שבהן פעלה.")}</p>
      <p>{t("Starwell is the modern expression of these roots - a capital platform and operational engine designed to create companies, develop real assets, and partner with exceptional operators. The underlying values remain constant: integrity, long-term ownership, and a responsibility to build things that endure.","סטארוול היא הביטוי המודרני של השורשים הללו - פלטפורמת הון ומנוע תפעולי שנועדו ליצור חברות, לפתח נכסים ריאליים ולחבור למפעילים יוצאי דופן. הערכים העומדים בבסיס נשארים קבועים: יושרה, בעלוּת לטווח ארוך ואחריות לבנות דברים שמחזיקים מעמד.")}</p>
    </div>
  </div>
</section>'''
    render("our-history.html",
      t("Our History | Starwell Holdings","ההיסטוריה שלנו | סטארוול הולדינגס"),
      t("Starwell builds on four generations of entrepreneurship, capital stewardship, and public leadership - from Max Factor and David M. Heyman to the Buchman family.",
        "סטארוול נשענת על ארבעה דורות של יזמות, נאמנות הונית ומנהיגות ציבורית - ממקס פקטור ודיוויד מ. היימן ועד משפחת בוכמן."),
      history)

    # =================== OUR TEAM (Leadership) ===================
    team=f'''<section class="hero hero-center">
  <div class="wrap">
    <h1>{t("Our Team","הצוות שלנו")}</h1>
  </div>
</section>

<section class="dark" id="leadership" data-reveal>
  <div class="wrap sec">
    <div class="sec-center" style="margin-bottom:44px"><h2 class="serif">{t("Leadership","הנהלה")}</h2></div>
    <div class="leader">
      <div class="photo"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/3f93d596d_AmitKochaviPic.jpg" alt="{t("Amit Kochavi","עמית כוכבי")}" loading="lazy" decoding="async"></div>
      <div>
        <div class="ln">{t("Amit Kochavi","עמית כוכבי")}</div>
        <div class="lt">{t("Chairman, CEO &amp; Founder","יו&quot;ר, מנכ&quot;ל ומייסד")}</div>
        <div class="body-copy">
          <p>{t("Amit founded Starwell Holdings to build a global private investment and operating company that combines long-term capital with operational execution.","עמית ייסד את סטארוול הולדינגס כדי לבנות חברת השקעות ותפעול גלובלית פרטית המשלבת הון לטווח ארוך עם ביצוע תפעולי.")}</p>
          <p>{t("His career spans technology, real estate, and civic leadership. He is the founder of Doss Israel Ltd. and shareholder in Doss Inc., Senior Advisor to the Mayor of Sderot, and a member of President Herzog&rsquo;s &ldquo;Voice of the People&rdquo; initiative.","הקריירה שלו משתרעת על פני טכנולוגיה, נדל&quot;ן ומנהיגות ציבורית. הוא מייסד Doss Israel Ltd. ובעל מניות ב-Doss Inc., יועץ בכיר לראש עיריית שדרות, וחבר ביוזמת &rdquo;קול העם&ldquo; של הנשיא הרצוג.")}</p>
          <p>{t("Amit continues to grow Starwell&rsquo;s portfolio of platforms and partnerships, focused on building enduring value across cycles and geographies.","עמית ממשיך להרחיב את תיק הפלטפורמות והשותפויות של סטארוול, מתוך מיקוד בבניית ערך מתמשך לאורך מחזורי שוק וגאוגרפיות.")}</p>
        </div>
      </div>
    </div>
    <div class="leader" style="margin-top:60px">
      <div class="photo" style="display:flex;align-items:center;justify-content:center"><span style="font-family:'Bodoni Moda',Georgia,serif;font-size:64px;font-weight:600;color:#fff">{t("SG","שג")}</span></div>
      <div>
        <div class="ln">{t("Shirly Gur Arie","שירלי גור אריה")}</div>
        <div class="lt">{t("Executive Assistant","עוזרת בכירה")}</div>
        <div class="body-copy">
          <p>{t("Shirly supports Starwell&rsquo;s leadership and day-to-day operations, coordinating across the firm&rsquo;s platforms and partners to keep the organization running smoothly.","שירלי תומכת בהנהלת סטארוול ובפעילות היומיומית, ומתאמת בין הפלטפורמות והשותפים של החברה כדי לשמור על התנהלות חלקה.")}</p>
        </div>
      </div>
    </div>
  </div>
</section>'''
    render("our-team.html",
      t("Our Team | Starwell Holdings","הצוות שלנו | סטארוול הולדינגס"),
      t("Meet the Starwell Holdings team, led by founder, chairman and CEO Amit Kochavi, building businesses across IT Services and Real Estate.",
        "הכירו את צוות סטארוול הולדינגס, בהובלת המייסד, היו\"ר והמנכ\"ל עמית כוכבי, הבונה עסקים בתחומי שירותי ה-IT והנדל\"ן."),
      team,extra_ld={"@context":"https://schema.org","@type":"Person","@id":BASE+"/our-team.html#amit-kochavi",
        "name":"Amit Kochavi","alternateName":["עמית כוכבי","Amit Kochavi"],
        "jobTitle":t("Chairman, CEO & Founder","יו\"ר, מנכ\"ל ומייסד"),
        "description":t("Founder, chairman and CEO of Starwell Holdings, a private investment and operating company building businesses across IT Services and Real Estate with passive capital allocation to public markets and alternative assets.",
                        "מייסד, יו\"ר ומנכ\"ל של סטארוול הולדינגס, חברת השקעות ותפעול פרטית הבונה עסקים בתחומי שירותי ה-IT והנדל\"ן עם הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים."),
        "worksFor":{"@id":BASE+"/#organization"},"url":BASE+"/our-team.html",
        "image":"https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689dffc3f89591b3d4bd4a0b/3f93d596d_AmitKochaviPic.jpg",
        "sameAs":["https://www.linkedin.com/company/starwell-holdings/"]})

    # =================== TECHNOLOGY ===================
    tech=f'''<section class="hero">
  <div class="wrap">
    <h1>IT<br>Services</h1>
    <p class="lead">{t("Acquiring controlling or significant stakes in IT services companies, in Israel and beyond.","רכישת שליטה או אחזקה משמעותית בחברות שירותי IT בישראל.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">{t("The Thesis","התזה")}</div>
    <p class="lede">{t("The IT services market is large, growing, and highly fragmented. Most of it consists of independent companies built on expertise and long-standing client relationships, without the backing of a larger group.","שוק שירותי ה-IT גדול, צומח ומפוצל מאוד. רובו מורכב מחברות עצמאיות שצמחו על בסיס מקצועיות ויחסים ארוכי שנים עם לקוחות, בלי גב של קבוצה גדולה.")}</p>
    <div class="body-copy">
      <p>{t("In a technology landscape that never stops changing - cloud migration, artificial intelligence, and successive waves of transformation - businesses need a trusted external technology partner more than ever.","בעולם טכנולוגי שמשתנה כל הזמן - מעבר לענן, בינה מלאכותית וגלי טרנספורמציה נוספים - עסקים זקוקים יותר מתמיד לשותף טכנולוגי חיצוני שילווה אותם לאורך הדרך.")}</p>
      <p>{t("Starwell acquires controlling or significant stakes in established, profitable IT services companies. We partner with owners and operators to preserve what works, while building around them the infrastructure and discipline of a platform built to last.","Starwell רוכשת שליטה או אחזקה משמעותית בחברות שירותי IT ותיקות ורווחיות. אנחנו חוברים לבעלים ולמנהלים כדי לשמר את מה שעובד, ובונים סביבם את התשתית והמשמעת של פלטפורמה שנבנית לשנים.")}</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps">
      <div class="step"><div class="n">01</div><h3>{t("Acquire","רכישה")}</h3><p>{t("Controlling or significant stakes in established, profitable IT services companies.","שליטה או אחזקה משמעותית בחברות שירותי IT ותיקות ורווחיות בישראל.")}</p></div>
      <div class="step"><div class="n">02</div><h3>{t("Integrate","אינטגרציה")}</h3><p>{t("Central systems, shared infrastructure, and a consistent standard of service across the portfolio.","מערכות מרכזיות, תשתית משותפת ורמת שירות אחידה בכל חברות הפורטפוליו.")}</p></div>
      <div class="step"><div class="n">03</div><h3>{t("Grow","צמיחה")}</h3><p>{t("Operational improvement, talent development, and expanded service capabilities, driving long-term value creation.","שיפור תפעולי, פיתוח ההון האנושי והרחבת יכולות השירות, ליצירת ערך לטווח ארוך.")}</p></div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">{t("Portfolio","פורטפוליו")}</div>
    <div class="pf-grid" data-pillar="technology">
{cards_for("technology")}
    </div>
  </div>
</section>'''
    render("technology.html",
      t("IT Services | Starwell Holdings","שירותי IT | סטארוול הולדינגס"),
      t("Starwell acquires controlling or significant stakes in established, profitable IT services companies, preserving what works while building a platform built to last.",
        "Starwell רוכשת שליטה או אחזקה משמעותית בחברות שירותי IT ותיקות ורווחיות, משמרת את מה שעובד ובונה סביבן פלטפורמה שנבנית לשנים."),
      tech,extra=live_script("portfolio"))

    # =================== REAL ESTATE ===================
    re=f'''<section class="hero">
  <div class="wrap">
    <h1>Starwell<br>Real Estate</h1>
    <p class="lead">{t("Development and strategic real estate investment across Israel and the United States.","ייזום והשקעות נדל&quot;ן אסטרטגיות בישראל ובארצות הברית.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">{t("Markets","שווקים")}</div>
    <div class="markets">
      <div class="market">
        <div class="ml">{t("Israel","ישראל")}</div>
        <h3>{t("Development &amp; Advisory","ייזום וייעוץ")}</h3>
        <p>{t("Residential and mixed-use development in Tel Aviv and central Israel, alongside institutional developers and public-sector partners. Focus on urban renewal and projects with structural demand tailwinds.","ייזום מגורים ושימושים מעורבים בתל אביב ובמרכז הארץ, לצד יזמים מוסדיים ושותפים מהמגזר הציבורי. מיקוד בהתחדשות עירונית ובפרויקטים עם רוח גבית מבנית בביקוש.")}</p>
      </div>
      <div class="market">
        <div class="ml">{t("United States","ארצות הברית")}</div>
        <h3>{t("Capital Allocation","הקצאת הון")}</h3>
        <p>{t("Limited partner investments in value-add multifamily and industrial logistics strategies, alongside institutional operators with demonstrated track records.","השקעות כשותף מוגבל (LP) באסטרטגיות value-add של מגורים רב-משפחתיים ולוגיסטיקה תעשייתית, לצד מפעילים מוסדיים בעלי רקורד מוכח.")}</p>
      </div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">{t("Selected Experience","ניסיון נבחר")}</div>
    <div class="xp-grid" data-pillar="real-estate">
{cards_for("real-estate")}
    </div>
  </div>
</section>'''
    render("real-estate.html",
      t("Starwell Real Estate | Starwell Holdings","Starwell Real Estate | סטארוול הולדינגס"),
      t("Starwell Real Estate covers development and strategic real estate investment across Israel and the United States, with development, advisory, and limited-partner positions.",
        "Starwell Real Estate עוסקת בייזום ובהשקעות נדל\"ן אסטרטגיות בישראל ובארצות הברית, לרבות ייזום, ייעוץ ופוזיציות כשותף מוגבל."),
      re,extra=live_script("portfolio"))

    # =================== CAPITAL ===================
    cap=f'''<section class="hero">
  <div class="wrap">
    <h1>Starwell<br>Capital</h1>
    <p class="lead">{t("The capital allocation arm of Starwell Holdings - deploying capital across private equity, public markets, hedge funds, and real estate.","זרוע ההשקעות של סטארוול הולדינגס. מקצה הון בין פרייבט אקוויטי, שווקים ציבוריים, קרנות גידור ונדל&quot;ן.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sec-label">{t("Approach","הגישה")}</div>
    <p class="lede">{t("Patient, conviction-driven capital allocation across private equity, public markets, and alternative strategies.","הקצאת הון סבלנית וממוקדת, בשווקים פרטיים וציבוריים כאחד.")}</p>
    <div class="body-copy">
      <p>{t("Starwell Capital oversees the firm&rsquo;s external capital deployment. The mandate spans private equity with a focus on AI-enabled roll-ups, long-term public market holdings, allocations to long-strategy hedge funds, and real estate. We invest with a long time horizon and concentrate where we have genuine conviction.","Starwell Capital מנהלת את תיק ההשקעות של הקבוצה מחוץ לחברות התפעוליות. המנדט כולל השקעות פרייבט אקוויטי ברכישת חברות והשבחתן, אחזקות ארוכות טווח בשווקים הציבוריים, הקצאות סלקטיביות לקרנות גידור ונדל&quot;ן. אנחנו משקיעים לטווח ארוך, ומרכזים את ההון היכן שיש לנו הבנה אמיתית של העסק.")}</p>
    </div>
  </section>
</div>

<div class="wrap">
  <section class="sec" style="padding-top:0" data-reveal>
    <div class="steps four">
      <div class="step"><div class="n">01</div><h3>{t("Private Equity","פרייבט אקוויטי")}</h3><p>{t("Private equity investments in buy-out and roll-up strategies, acquiring and improving traditional businesses through operational, financial, and technological efficiency.","רכישת עסקים והשבחתם באמצעות שיפור תפעולי, פיננסי וטכנולוגי.")}</p></div>
      <div class="step"><div class="n">02</div><h3>{t("Public Markets","שווקים ציבוריים")}</h3><p>{t("Long-term concentrated holdings in public companies where the firm has deep conviction in the business and management team.","תיק מרוכז של אחזקות ארוכות טווח בחברות ציבוריות שבהן יש לנו אמון עמוק בעסק ובהנהלה.")}</p></div>
      <div class="step"><div class="n">03</div><h3>{t("Hedge Funds","קרנות גידור")}</h3><p>{t("Selective allocations to long-strategy hedge funds with differentiated process and consistent risk-adjusted performance.","הקצאות סלקטיביות לקרנות עם תהליך השקעה מובחן וביצועים עקביים ביחס לסיכון.")}</p></div>
      <div class="step"><div class="n">04</div><h3>{t("Real Estate","נדל&quot;ן")}</h3><p>{t("Capital allocations to real estate funds and structures as part of a diversified long-term portfolio.","השקעות בקרנות ובמבני נדל&quot;ן כרכיב ארוך טווח בתיק.")}</p></div>
    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec">
    <div class="sec-label">{t("Portfolio","פורטפוליו")}</div>
    <div class="pf-grid" data-pillar="capital">
{cards_for("capital")}
    </div>
  </div>
</section>'''
    render("capital.html",
      t("Starwell Capital | Starwell Holdings","Starwell Capital | סטארוול הולדינגס"),
      t("Starwell Capital is the allocation arm of Starwell Holdings, deploying capital across private equity, public markets, hedge funds, and real estate.",
        "Starwell Capital היא זרוע הקצאת ההון של סטארוול הולדינגס, המקצה הון בתחומי הון פרטי, שווקים ציבוריים, קרנות גידור ונדל\"ן."),
      cap,extra=live_script("portfolio"))

    # =================== NEWS ===================
    cats_en=["All"]+list(dict.fromkeys(n[0] for n in NEWS))
    def cat_label(c): return t("All","הכל") if c=="All" else c
    pills="".join(f'<button class="pill{" active" if c=="All" else ""}" data-cat="{("all" if c=="All" else c)}">{cat_label(c)}</button>' for c in cats_en)
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
          <span class="link-arrow">{t("Read More","קראו עוד")} &rarr;</span>
        </div>
      </a>
'''
    news=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">{t("News","חדשות")}</span>
    <h1>{t("News &amp; Insights","חדשות ותובנות")}</h1>
    <p class="lead">{t("Company news, market commentary, and updates on our investments.","חדשות החברה, פרשנות שוק ועדכונים על ההשקעות שלנו.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <div class="filters">{pills}</div>
    <div class="news-grid">
{cards}    </div>
  </section>
</div>'''
    render("news.html",
      t("News | Starwell Holdings","חדשות | סטארוול הולדינגס"),
      t("Company news, market commentary, and updates on Starwell Holdings investments and activities.",
        "חדשות החברה, פרשנות שוק ועדכונים על ההשקעות והפעילות של סטארוול הולדינגס."),
      news,extra=live_script("news"))

    # =================== CONTACT ===================
    contact=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">{t("Contact","צור קשר")}</span>
    <h1>{t("Get in Touch","דברו איתנו")}</h1>
    <p class="lead">{t("For inquiries about investment opportunities, partnerships, or potential transactions, please complete the form below. A member of our team will respond promptly.","לפניות בנושא הזדמנויות השקעה, שותפויות או עסקאות פוטנציאליות, נא למלא את הטופס שלהלן. נציג מהצוות שלנו ישוב אליכם בהקדם.")}</p>
  </div>
</section>

<div class="wrap">
  <div class="contact-card" data-reveal>
    <form id="contactForm" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="contact">
      <p hidden><label>Leave empty: <input name="bot-field"></label></p>
      <div class="frow">
        <div class="field"><label for="fn">{t("First Name","שם פרטי")} *</label><input id="fn" name="first_name" type="text" required></div>
        <div class="field"><label for="ln">{t("Last Name","שם משפחה")} *</label><input id="ln" name="last_name" type="text" required></div>
      </div>
      <div class="field"><label for="org">{t("Organization","ארגון")}</label><input id="org" name="organization" type="text"></div>
      <div class="field"><label for="em">{t("Email","דוא&quot;ל")} *</label><input id="em" name="email" type="email" required></div>
      <div class="field"><label for="sub">{t("Subject","נושא")}</label><input id="sub" name="subject" type="text"></div>
      <div class="field"><label for="msg">{t("Message","הודעה")}</label><textarea id="msg" name="message"></textarea></div>
      <div class="captcha"><label for="captchaAnswer">{t("What is 10 + 10?","כמה זה 10 + 10?")}</label><input id="captchaAnswer" name="captcha" type="text" autocomplete="off" required></div>
      <button type="submit" class="btn">{t("Submit","שליחה")}</button>
      <div class="formnote" id="formnote" role="status" aria-live="polite"></div>

      <div class="offices">
        <div class="ol">{t("Offices","משרדים")}</div>
        <div class="office"><h4>{t("Tel Aviv","תל אביב")}</h4><p>{t("Beyond Towers<br>Giv&rsquo;atayim, Israel","מגדלי ביונד<br>גבעתיים, ישראל")}</p></div>
        <div class="office"><h4>{t("Los Angeles","לוס אנג&rsquo;לס")}</h4><p>{t("11601 Wilshire Blvd<br>Los Angeles, CA 90025<br>USA","11601 Wilshire Blvd<br>Los Angeles, CA 90025<br>ארה&quot;ב")}</p></div>
      </div>
    </form>
  </div>
</div>
<div style="height:60px"></div>'''
    render("contact.html",
      t("Contact | Starwell Holdings","צור קשר | סטארוול הולדינגס"),
      t("Contact Starwell Holdings about investment opportunities, partnerships, or potential transactions. Offices in Tel Aviv and Los Angeles.",
        "צרו קשר עם סטארוול הולדינגס בנושא הזדמנויות השקעה, שותפויות או עסקאות. משרדים בתל אביב ובלוס אנג'לס."),
      contact)

    # =================== CAREERS ===================
    value_cards="".join(f'      <div class="step"><h3>{t(en,he)}</h3><p>{t(de,dh)}</p></div>\n' for en,he,de,dh in CAREER_VALUES)
    CAREER_CATS=[("All","הכל"),("Technology","טכנולוגיה"),("Real Estate","נדל&quot;ן"),
                 ("Capital & Investments","הון והשקעות"),("Operations","תפעול"),("Finance","פיננסים")]
    career_pills="".join(f'<button class="pill{" active" if en=="All" else ""}" data-cat="{("all" if en=="All" else en)}">{t(en,he)}</button>' for en,he in CAREER_CATS)
    careers=f'''<section class="hero hero-center">
  <div class="wrap">
    <span class="eyebrow">{t("Join Us","הצטרפו אלינו")}</span>
    <h1>{t("Careers at Starwell","קריירה בסטארוול")}</h1>
    <p class="lead" style="margin-left:auto;margin-right:auto">{t("We&rsquo;re a small, high-conviction team building platforms across IT Services and Real Estate, with passive capital allocation to public markets and alternative assets. We look for people who think long-term and operate with precision.","אנחנו צוות קטן ומובל-שכנוע הבונה פלטפורמות בתחומי שירותי ה-IT והנדל&quot;ן, עם הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים. אנחנו מחפשים אנשים שחושבים לטווח ארוך ופועלים בדייקנות.")}</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" data-reveal>
    <h2 class="serif" style="margin-bottom:44px">{t("How We Work","איך אנחנו עובדים")}</h2>
    <div class="steps four" style="text-align:{t("left","right")}">
{value_cards}    </div>
  </section>
</div>

<section class="dark" data-reveal>
  <div class="wrap sec sec-center">
    <h2 class="serif" style="margin-bottom:8px">{t("Open Positions","משרות פתוחות")}</h2>
    <p class="body-copy" style="margin:0 auto 34px">{t("Click any role to learn more and apply.","לחצו על משרה כדי לקרוא עוד ולהגיש מועמדות.")}</p>
    <div class="filters" style="justify-content:center">{career_pills}</div>
    <div id="positions" style="text-align:{t("left","right")};max-width:760px;margin:0 auto"></div>
    <p class="body-copy" id="posEmpty" style="margin:40px auto 0">{t("No open positions in this category at the moment. Check back soon or reach out directly at","אין כרגע משרות פתוחות בקטגוריה זו. בדקו שוב בקרוב או פנו ישירות אל")} <a href="mailto:careers@starwellholdings.com" class="link-arrow on-dark">careers@starwellholdings.com</a>.</p>
  </div>
</section>

<div class="wrap">
  <section class="sec sec-center" data-reveal>
    <h2 class="serif" style="margin-bottom:14px">{t("Don&rsquo;t see the right role?","לא מצאתם את המשרה המתאימה?")}</h2>
    <p class="body-copy" style="margin:0 auto 28px">{t("We&rsquo;re always interested in meeting exceptional people. Send us a note and tell us how you&rsquo;d contribute.","תמיד נשמח להכיר אנשים יוצאי דופן. שלחו לנו הודעה וספרו כיצד תוכלו לתרום.")}</p>
    <a href="mailto:careers@starwellholdings.com" class="btn">{t("Get in Touch","דברו איתנו")}</a>
  </section>
</div>'''
    render("careers.html",
      t("Careers | Starwell Holdings","קריירה | סטארוול הולדינגס"),
      t("Careers at Starwell Holdings. We're a small, high-conviction team building platforms across IT Services and Real Estate, with passive capital allocation to public markets and alternative assets.",
        "קריירה בסטארוול הולדינגס. אנחנו צוות קטן ומובל-שכנוע הבונה פלטפורמות בתחומי שירותי ה-IT והנדל\"ן, עם הקצאת הון פסיבית לשווקים הציבוריים ולנכסים אלטרנטיביים."),
      careers,extra=live_script("careers"))

    # =================== SITEMAP (human) ===================
    sm=f'''<section class="hero hero-center">
  <div class="wrap">
    <span class="eyebrow">{t("Sitemap","מפת אתר")}</span>
    <h1>{t("Sitemap","מפת אתר")}</h1>
    <p class="lead" style="margin-left:auto;margin-right:auto">{t("Every page on the Starwell Holdings website, organized in one place.","כל העמודים באתר של סטארוול הולדינגס, מאורגנים במקום אחד.")}</p>
  </div>
</section>
<div class="wrap">
  <section class="sec" data-reveal>
    <div class="sitemap-cols">
      <div><h4>{t("Company","החברה")}</h4>
        <a href="{t("/","/he/")}">{t("Home","ראשי")}</a>
        <a href="our-story">{t("About Us","אודות")}</a>
        <a href="our-history">{t("Our History","ההיסטוריה שלנו")}</a>
        <a href="our-team">{t("Our Team","הצוות שלנו")}</a>
        <a href="news">{t("News","חדשות")}</a>
        <a href="careers">{t("Careers","קריירה")}</a></div>
      <div><h4>{t("What We Do","מה אנחנו עושים")}</h4>
        <a href="technology">{t("IT Services","שירותי IT")}</a>
        <a href="real-estate">{t("Real Estate","נדל&quot;ן")}</a>
        <a href="capital">{t("Capital","קפיטל")}</a></div>
      <div><h4>{t("Resources","משאבים")}</h4>
        <a href="contact">{t("Contact","צור קשר")}</a>
        <a href="search">{t("Search","חיפוש")}</a>
        <a href="{t("/sitemap","/he/sitemap")}">{t("Sitemap","מפת אתר")}</a>
        <a href="{t("he/","../")}" hreflang="{t("he","en")}">{t("עברית","English")}</a></div>
    </div>
  </section>
</div>'''
    render("sitemap.html",
      t("Sitemap | Starwell Holdings","מפת אתר | סטארוול הולדינגס"),
      t("Sitemap for Starwell Holdings: company, platforms, news, and contact pages.",
        "מפת אתר של סטארוול הולדינגס: עמודי החברה, הפלטפורמות, החדשות ויצירת הקשר."),
      sm)

    # =================== 404 ===================
    nf=f'''<section class="hero">
  <div class="wrap">
    <span class="eyebrow">{t("Error 404","שגיאה 404")}</span>
    <h1>{t("Page not found.","העמוד לא נמצא.")}</h1>
    <p class="lead">{t("The page you are looking for does not exist or has moved.","העמוד שחיפשתם אינו קיים או הועבר.")}</p>
    <div class="hero-cta"><a href="{t("/","/he/")}" class="btn btn-light">{t("Return home","חזרה לדף הבית")}</a></div>
  </div>
</section>'''
    render("404.html",
      t("Page not found | Starwell Holdings","העמוד לא נמצא | סטארוול הולדינגס"),
      t("The page could not be found.","העמוד לא נמצא."),nf,index=False,search=False)

    # =================== SEARCH ===================
    srch=f'''<section class="hero hero-center">
  <div class="wrap">
    <h1 id="searchHeading">{t("Search","חיפוש")}</h1>
    <p class="lead" id="searchCount" style="margin-left:auto;margin-right:auto"></p>
  </div>
</section>

<div class="wrap">
  <section class="sec" data-reveal>
    <form action="search" method="get" role="search" class="search-page-form">
      <input type="search" name="q" id="searchPageInput" placeholder="{t("Search Starwell Holdings","חיפוש בסטארוול הולדינגס")} …" aria-label="{t("Search","חיפוש")}" autocomplete="off">
      <button type="submit" class="btn">{t("Search","חיפוש")}</button>
    </form>
    <div class="cards" id="searchResults" style="margin-top:40px"></div>
    <p class="body-copy" id="searchEmpty" style="text-align:center;color:var(--ink-soft);margin-top:22px"></p>
  </section>
</div>'''
    search_js='''<script src="search-index.js"></script>
<script>
(function(){
  var q=(new URLSearchParams(location.search).get("q")||"").trim();
  var idx=window.SEARCH_INDEX||[];
  var head=document.getElementById("searchHeading"),count=document.getElementById("searchCount"),
      wrap=document.getElementById("searchResults"),empty=document.getElementById("searchEmpty"),
      input=document.getElementById("searchPageInput");
  if(input)input.value=q;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  if(!q){empty.textContent=__PROMPT__;return;}
  var ql=q.toLowerCase();
  var res=idx.filter(function(d){return (d.title+" "+d.text).toLowerCase().indexOf(ql)>=0;});
  head.innerHTML=__SEARCHED__+" <em>"+esc(q)+"</em>";
  count.textContent=res.length+" "+(res.length===1?__ONE__:__MANY__);
  if(!res.length){empty.textContent=__NONE__;return;}
  wrap.innerHTML=res.map(function(d){
    var x=d.text,i=x.toLowerCase().indexOf(ql),snip;
    if(i<0){snip=esc(x.slice(0,150))+"…";}
    else{var s=Math.max(0,i-70);snip=(s>0?"…":"")+esc(x.slice(s,i))+"<mark>"+esc(x.substr(i,q.length))+"</mark>"+esc(x.slice(i+q.length,i+q.length+90))+"…";}
    return '<a class="card" href="'+encodeURI(d.url)+'" style="text-decoration:none;color:inherit;display:block"><h3>'+esc(d.title)+' &rsaquo;</h3><p class="search-snippet">'+snip+'</p></a>';
  }).join("");
})();
</script>'''
    search_extra=(search_js
      .replace("__PROMPT__",json.dumps(t("Type a search term above to search Starwell Holdings.","הקלידו מונח חיפוש למעלה כדי לחפש בסטארוול הולדינגס."),ensure_ascii=False))
      .replace("__SEARCHED__",json.dumps(t("You searched for:","חיפשתם:"),ensure_ascii=False))
      .replace("__ONE__",json.dumps(t("result","תוצאה"),ensure_ascii=False))
      .replace("__MANY__",json.dumps(t("results","תוצאות"),ensure_ascii=False))
      .replace("__NONE__",json.dumps(t("No results found.","לא נמצאו תוצאות."),ensure_ascii=False)))
    render("search.html",
      t("Search | Starwell Holdings","חיפוש | סטארוול הולדינגס"),
      t("Search Starwell Holdings.","חיפוש באתר סטארוול הולדינגס."),
      srch,index=False,extra=search_extra,search=False)

    # search index for this language (consumed by search.html at runtime)
    open(out_path("search-index.js"),"w").write("window.SEARCH_INDEX="+json.dumps(SEARCH_INDEX[LANG],ensure_ascii=False)+";\n")

# Build English (root) then Hebrew (/he/)
os.makedirs(os.path.join(OUT,"he"),exist_ok=True)
for LANG in LANGS:
    build_site()

# =================== sitemap.xml / robots / manifest / configs ===================
# Each URL lists both language alternates (xhtml:link) so Google pairs them.
pages=[("index.html","1.0"),("our-story.html","0.9"),("our-history.html","0.6"),
       ("our-team.html","0.6"),("technology.html","0.8"),
       ("real-estate.html","0.8"),("capital.html","0.8"),("news.html","0.7"),
       ("contact.html","0.7"),("careers.html","0.5"),("sitemap.html","0.3")]
def alt_links(slug):
    en_url=BASE+"/"+slug; he_url=BASE+"/he/"+slug
    return (f'    <xhtml:link rel="alternate" hreflang="en" href="{en_url}"/>\n'
            f'    <xhtml:link rel="alternate" hreflang="he" href="{he_url}"/>\n'
            f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_url}"/>\n')
urls=""
for fn,pr in pages:
    slug="" if fn=="index.html" else fn[:-5]
    for base_loc in (BASE+"/"+slug, BASE+"/he/"+slug):
        urls+=(f"  <url>\n    <loc>{base_loc}</loc>\n"+alt_links(slug)+
               f"    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n  </url>\n")
open(os.path.join(OUT,"sitemap.xml"),"w").write(
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+urls+'</urlset>\n')

# ---- legacy base44 URL redirects -------------------------------------------
# The previous (base44) site used PascalCase SPA routes like /RealEstate that
# Google still has indexed; they now 404. A 301 sends visitors to the right
# page AND tells Google to drop the old URL and replace it with the target -
# the correct way to retire a stale indexed URL (much faster than a bare 404).
# Both case variants are listed because Netlify path matching is case-sensitive.
LEGACY=[
  ("/Home","/"),("/home","/"),("/Index","/"),
  ("/OurStory","/our-story"),("/ourstory","/our-story"),("/Our-Story","/our-story"),("/About","/our-story"),
  ("/Technology","/technology"),
  ("/RealEstate","/real-estate"),("/realestate","/real-estate"),("/Real-Estate","/real-estate"),
  ("/Capital","/capital"),
  ("/News","/news"),
  ("/Contact","/contact"),
  ("/Careers","/careers"),
  ("/Sitemap","/sitemap"),
]
# Clean URLs (no .html). For every page, in both languages: serve the .html
# file at its clean path (200, URL stays clean) and 301 the old .html URL to
# the clean one so previously-indexed .html pages consolidate cleanly.
SLUGS=["our-story","our-history","our-team","technology","real-estate","capital","news","contact","careers","sitemap","search"]
serve=[]; htmlredir=[]
for base in ("","/he"):
    htmlredir.append((base+"/index.html", base+"/"))
    for s in SLUGS:
        serve.append((base+"/"+s, base+"/"+s+".html"))
        htmlredir.append((base+"/"+s+".html", base+"/"+s))
open(os.path.join(OUT,"_redirects"),"w").write(
  "# Legacy base44 routes -> current pages (301, de-indexes the old URLs)\n"+
  "\n".join(f"{src}  {dst}  301!" for src,dst in LEGACY)+"\n\n"+
  "# Old .html URLs -> clean URLs (301)\n"+
  "\n".join(f"{src}  {dst}  301!" for src,dst in htmlredir)+"\n\n"+
  "# Serve clean URLs from the .html files (200, no redirect)\n"+
  "\n".join(f"{src}  {dst}  200" for src,dst in serve)+"\n")
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
