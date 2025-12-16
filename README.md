# MessVerse (frontend)
Luxury, story-and-identity focused single-page site.

## Dev
Open `index.html` directly for quick iteration, or run a static server (recommended for PWA/service worker):

```sh
npx serve .
```

## Content
All content lives in `index.html` inside the embedded JSON script tag:
- `<script id="mv-data" type="application/json">…</script>`

Update:
- `members[]` (names, bios, identity tags, highlights, portrait paths)
- `timeline[]`
- `gallery[]`
- `quotes[]`

### Assets
Placeholder images are included as SVGs:
- Member portraits: `assets/members/m01.svg` … `m10.svg`
- Gallery placeholders: `assets/gallery/g01.svg` … `g06.svg`

Replace these with real photos whenever you want (keep the paths in `mv-data` in sync).

## Deploy (Vercel)
- New Project → Import this repo
- Framework preset: "Other"
- Build Command: none
- Output Directory: `.`
- Vercel will serve `index.html` from the repo root
