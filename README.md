# MessVerse (frontend)
Immersive, identity-driven site for our mess members. Static prototype with PWA, accessibility, and performance baked in.

## Features
- Hero mosaic with layered parallax and hover/focus reveals
- Identity showcase (bands A–D) with generative accents per member
- SVG timeline that draws on scroll + keyboard navigation and tooltip
- Interactive quotes (drift + shuffle), hover/focus parity
- Preferences panel: Reduce motion, High contrast, Type size
- PWA: offline-ready manifest + service worker
- Accessibility: skip link, focus rings, reduced-motion support
- Performance: content-visibility, minimal layout thrash, lazy reveals

## Dev
Open `index.html` directly or run a quick static server for PWA:

```sh
npx serve .
```

## Deploy (Vercel)
- New Project → Import this repo
- Framework preset: "Other"
- Build Command: none
- Output Directory: `.`
- Vercel will serve `index.html` from the repo root

## Content
Edit embedded JSON in `index.html` (script tag with id `members-data`).
Add portraits under `assets/` and reference them in the JSON.
