# Starwell Holdings — Website

A static, multi-page marketing site for Starwell Holdings. Plain HTML, one shared
CSS file, one shared JS file. No build step, no framework, no dependencies.

## Open this in Claude Code

A good first prompt:

> "This is a static website. Start a local preview server so I can see it, then help
> me deploy it to Netlify and connect the domain starwellholdings.com."

Claude Code can run the preview, deploy, and walk the domain setup with you.

## Preview locally

Each page is self-contained: the CSS and JS are inlined into every HTML file, so you
can simply open `index.html` (or any page) directly in a browser and it renders
correctly. Tapping a page in a phone file viewer works too.

To browse the whole site with working internal links, a local server is still the
closest match to production:

```bash
cd starwell-website
python3 -m http.server 8080
# then open http://localhost:8080
```

## Structure

```
starwell-website/
  index.html          Home (hero, What We Do, Activity Highlights)
  our-story.html      About, Business Focus, Strategy, Leadership, Partnership, Legacy
  technology.html     Starwell Technologies
  real-estate.html    Starwell Real Estate
  capital.html        Starwell Capital
  news.html           News (cards link out; category filter)
  contact.html        Get in Touch (form + offices)
  careers.html        Careers
  sitemap.html        Human sitemap
  404.html            Not-found page
  dashboard.html      Private portfolio dashboard (internal tool, noindex)
  styles.css          All styling (edit once, applies everywhere)
  script.js           Menu, news filter, reveal, contact form
  build.py            Regenerates the pages from data + shared nav/footer
  data/
    portfolio.json    Portfolio entries that drive the pillar pages + homepage
  sitemap.xml         For search engines
  robots.txt
  site.webmanifest
  netlify.toml        Netlify config + headers
  vercel.json         Vercel config + headers
  assets/
    og-image.png          social share card (1200x630)
    apple-touch-icon.png  180x180
    icon-512.png          512x512
    favicon-32.png        32x32
    logos/                ← drop real portfolio/partner logos here
```

## Editing copy and styling

Page text is plain HTML inside each file. Headings use Playfair Display (serif);
body uses Inter.

Styling and behavior have a single source of truth: `styles.css` and `script.js`.
The pages have those inlined (so they render standalone), and `build.py` regenerates
every page from the shared nav, footer, and these two files:

```bash
python3 build.py   # rewrites all pages after you edit styles.css, script.js, or build.py
```

Editing one page's text directly is fine too; just avoid hand-editing the inlined
`<style>`/`<script>` blocks, since `build.py` will overwrite them on the next run.

## To do before launch

1. **Portfolio & partner logos.** The cards currently show text placeholders
   (e.g., a box reading "Cormi"). Add real logo images to `assets/logos/` and
   replace the `<span>` inside each `.logo-chip` / `.lchip` with an `<img>`.
2. **News links.** Each news card `href="#"` is a placeholder. Replace with the real
   source URLs. The cards already link out and filter by category.
3. **Photos.** The Leadership portrait, Legacy figures, and project/news images are
   styled placeholders (the dark blocks). Swap in real images.
4. **LinkedIn.** Replace the `href="#"` LinkedIn links (footer + contact) with the URL,
   and add it to the JSON-LD `sameAs` if you want it in structured data.
5. **Contact form.** Works automatically on Netlify (already wired). On other hosts,
   point it at Formspree — see DEPLOY.md.

## Managing the portfolio (dashboard)

`dashboard.html` is a private tool for adding and editing investments and operating
companies. It is marked `noindex` and is blocked in `robots.txt`, so it will not show
up in search. Open it directly in a browser.

In the dashboard you can:
- Add, edit, or delete holdings, with pillar, type, role, location, partner, website,
  status, an optional logo upload, and a "feature on homepage" toggle.
- Search and filter by pillar.
- Your changes are saved in your browser automatically.

To push changes to the live site:
1. Click **Export JSON** in the dashboard.
2. Save the downloaded file as `data/portfolio.json` (replacing the existing one).
3. Run `python3 build.py` to regenerate the pages.
4. Redeploy.

The Technology, Real Estate, and Capital pages and the homepage "Activity Highlights"
all render from `data/portfolio.json`, so that one file is the single source of truth
for the portfolio.

> Keep `dashboard.html` private. If you would rather it not live on the public site at
> all, simply delete it before deploying, or protect it (e.g., Netlify password
> protection). It only edits a local file and never writes to your server.

## The brand

Typography is the brand's official pairing: **Bodoni Moda** for the wordmark and
headings, **Inter** for body and UI. Core palette: ink `#0F0F12`, paper `#FBFBFC`,
and gold `#9A7B4F` as the single accent. The logo lockup ("Starwell" + gold rule +
"HOLDINGS") appears in the nav and footer and matches the brand book.

## Deploy

See `DEPLOY.md`. Shortest path: drag this folder onto https://app.netlify.com/drop,
then add the custom domain. Everything is configured for it.
