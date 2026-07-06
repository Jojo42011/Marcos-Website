# Marco Puga — Digital Platform

A premium, high-performance marketing site for real estate advisor **Marco Puga**
(San Antonio + Miami). Built to replace a dated Brivity template with something
that reads *legit, active, and not like every other agent* — the exact brief.

**Tagline:** _Straight Answers. Real Results._

---

## Stack

- **[Astro](https://astro.build)** — `hybrid` output. Every marketing page is
  prerendered to static HTML for instant mobile loads; only the lead-intake API
  route is server-rendered.
- **[@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/)**
  adapter (standalone) — host-agnostic. Swap for `@astrojs/vercel` /
  `@astrojs/netlify` at deploy time with no code changes.
- **Self-hosted fonts** via `@fontsource` (Playfair Display + Montserrat) — no
  CDN request on the critical path.
- Near-zero client JS (~3.5 kB gzipped total): mobile nav, multi-step form,
  scroll reveals, and the lazy TikTok facade.

## Run it

```bash
npm install
npm run dev        # local dev at http://localhost:4321
npm run build      # production build → dist/
node dist/server/entry.mjs   # run the built server (HOST/PORT env vars)
```

## Project shape

```
src/
  config.ts              # single source of truth: phone #, nav, taglines
  layouts/Base.astro     # <head>, header, footer, sticky text bar, scroll reveals
  components/
    Logo.astro           # Marco's real logo (dark + light-on-dark variants)
    Header.astro         # solid white sticky nav
    Footer.astro
    Button.astro         # primary (crimson) / outline CTA
    StickyTextBar.astro  # mobile-only bottom "Text Marco" bar
    Gallery.astro        # premium photo grid (placeholders → real photos)
    IntakeForm.astro     # 5-step intake form
    PageHero.astro       # dark cinematic hero for interior pages
  pages/
    index.astro          # Home
    buyers.astro         # The Buyer Experience
    sellers.astro        # The Seller Strategy
    about.astro          # Track Record
    contact.astro        # Text CTA + intake form
    api/lead.ts          # form endpoint → CRM (server-rendered)
  lib/crm.ts             # provider-swappable CRM adapter
  styles/
    tokens.css           # brand palette + type scale (change brand here)
    global.css           # base styles
public/
  favicon.svg            # MP monogram favicon
```

## Wiring the CRM (open item)

The intake form POSTs to `/api/lead`, which calls `sendLead()` in
[`src/lib/crm.ts`](src/lib/crm.ts). Which provider runs is set by the
`CRM_PROVIDER` env var — **no form or endpoint changes needed** to switch.

1. Copy `.env.example` → `.env`.
2. Set `CRM_PROVIDER` to one of: `console` (default — logs only, safe for dev),
   `followupboss`, `hubspot`, or `webhook`.
3. Fill the matching key (`FUB_API_KEY`, `HUBSPOT_ACCESS_TOKEN`, or
   `CRM_WEBHOOK_URL`). **Keys stay server-side and are never committed.**

Adding a new CRM = write one function and register it in the `providers` map.

> **Action needed from Marco:** confirm which CRM he uses + provide API access,
> then it's a ~1-line config change. Until then the form works end-to-end and
> logs leads to the server console so nothing is lost.

## Dropping in real assets

The site ships with tasteful, clearly-labeled placeholders so it demos as
premium today. Search the code for **`SWAP POINT`** to find each one:

| Asset | Where | Notes |
|-------|-------|-------|
| Hero video/image | `src/pages/index.astro` | Add `public/video/hero.webm` + `hero.mp4` + `hero-poster.jpg`, uncomment `<source>` tags. Compress aggressively. |
| Gallery photos | `src/components/Gallery.astro` | Set `src` on each item to a real `public/photos/*.jpg`. |
| Closing photos | `src/pages/about.astro` | Swap the `.shot__ph` placeholders for candid `public/photos/*.jpg`. |

## Logo

Marco's real logo lives in `public/brand/`. Three prepared files, all derived
from the source art (`logo-original.png`):

- `logo.png` — transparent background, original colors (for light surfaces)
- `logo-light.png` — white text + red emblem (for the dark footer)
- `apple-touch-icon.png` + `public/favicon.png` — the emblem, cropped for icons

## Brand tokens

Palette and type live in [`src/styles/tokens.css`](src/styles/tokens.css):
Crimson `#990000` · Obsidian `#000000` · Light Gray `#f3f5f8` · White `#ffffff`;
Playfair Display (headings) + Montserrat (body).

**Deliberately excluded** per the brief's anti-goals: stock family photos, fake
countdown timers, autoplay audio, review-badge walls, and "your dream home
awaits" filler.
