# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands
This repo is a static frontend (no build step).

### Run locally
Recommended (so the service worker can register over http):

```sh
npx serve .
```

Notes:
- Opening `index.html` directly works for most UI, but the service worker in `sw.js` only registers when served over `http:`/`https:`.

### Tests / lint
There are currently no test runner or linter commands configured in this repo.

## High-level architecture
Single-page static site. Content is embedded in `index.html` and rendered by `scripts/main.js`.

### Entry points
- `index.html`: Page structure, modals, and embedded JSON content.
- `scripts/main.js`: Reads embedded JSON, renders members/timeline/gallery/quotes, and wires up interactions.
- `styles/tokens.css`: Palette + typography + motion timings.
- `styles/main.css`: Layout and component styling.
- `sw.js` + `manifest.webmanifest`: PWA/offline support.

### Content model (embedded JSON)
`index.html` includes:
- `<script id="mv-data" type="application/json">…</script>`

`main.js` reads that JSON and renders:
- `members[]` → member cards in `#membersGrid` + member modal (`#memberModal`)
- `timeline[]` → vertical timeline list in `#timelineList`
- `gallery[]` → gallery grid in `#galleryGrid` + lightbox (`#lightbox`)
- `quotes[]` → quote cards in `#quotesGrid` (shuffle via `#shuffleQuotes`)

### Assets
- Member portraits live under `assets/members/`.
- Gallery images live under `assets/gallery/`.

If you replace placeholder SVGs with real images, keep `mv-data` paths in sync.

### UI conventions
- Reveal-on-scroll: elements with `[data-reveal]` are given `.is-inview` via an `IntersectionObserver`.
- Nav highlighting: the top nav highlights the most visible section using an `IntersectionObserver`.
- Overlays (member modal + gallery lightbox): ESC/backdrop click closes; focus is trapped while open.

### PWA/service worker
`sw.js` implements a cache-first strategy:
- Pre-caches a fixed `ASSETS` list.
- Falls back to `index.html` when offline.

When changing core asset filenames/paths, bump `CACHE_NAME` in `sw.js` so clients refresh caches.

## Deployment (Vercel)
From `README.md`:
- Vercel preset: “Other”
- Build Command: none
- Output Directory: `.`
