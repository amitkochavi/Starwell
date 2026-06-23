# Deploy guide — Starwell Holdings

Static site. No build step. Put the folder online and point the domain at it.

## Fastest: Netlify Drop (about 5 minutes, no tools)
1. Go to https://app.netlify.com/drop
2. Drag the `starwell-website` folder onto the page. You get a live URL instantly.
3. The contact form works immediately. Submissions appear under the site's
   "Forms" tab; add email notifications there.
4. Add your domain: Site configuration > Domain management > Add a custom domain >
   starwellholdings.com. Netlify shows the DNS records.
5. At your registrar, point the domain to Netlify (nameservers or the A/CNAME
   records Netlify lists). HTTPS turns on automatically once DNS resolves.

## Vercel
1. `npm i -g vercel`
2. In the folder: `vercel --prod`
3. Add the domain in the Vercel dashboard.
   Netlify Forms won't run here — switch the form to Formspree (below).

## Cloudflare Pages
1. Upload the folder (or connect a GitHub repo). No build command; output dir = root.
2. Add the custom domain in the Pages project.

## Contact form on non-Netlify hosts
Create a form at https://formspree.io and change the `<form>` tag in `contact.html`:

```html
<form id="contactForm" action="https://formspree.io/f/XXXX" method="POST">
```
Remove the `data-netlify`, `form-name`, and `bot-field` lines.

## After go-live — get indexed well
1. Confirm the site serves on https://starwellholdings.com (canonical tags already
   point there).
2. Add the property in Google Search Console and verify it.
3. Submit the sitemap: https://starwellholdings.com/sitemap.xml
4. Use URL Inspection > Request indexing on the homepage.
