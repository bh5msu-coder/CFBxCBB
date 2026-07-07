# CFBxCBB

**CFB × CBB Power Index** — an interactive React app ranking college programs across 50 seasons (1976–2025) in both football and basketball.

**🔗 Live site: https://bh5msu-coder.github.io/CFBxCBB/**

Programs carry era-bucketed scores (1976–89 / 1990–99 / 2000–09 / 2010–25) across six metric families (Championships, Win %, Pro Production, Recruiting, Poll Presence, Advanced) per sport, on a relative 0–100 scale. The scoring engine re-aggregates live as you adjust era windows, recency weighting, and metric weights.

### Views
- **Ladder** — tiered rankings (Blue Blood / Elite / Power / Solid / Rising)
- **Quadrant** — two-sport scatter plot (football vs. basketball)
- **Heatmap** — sortable per-family breakdown table (family cells reconcile with the shown score)
- **Champions** — season-by-season national-title ledger (the forward-looking surface)

### Features
- Sport toggle (Football / Basketball / Combined, with a two-sport balance bonus)
- Era-window selection + recency weighting
- Adjustable metric weights
- Conference filter, name search, and program spotlighting
- Vacated-results toggle (Official vs. On-field) — **now actually re-scores** flagged programs
- Light / dark theme (follows your OS preference, with a manual toggle)
- CSV export of the current ranking
- Per-program detail modal and a methodology panel
- Accessible: keyboard-operable controls, visible focus states, `prefers-reduced-motion` support, and WCAG-minded contrast

### Design & structure

The UI follows a data-dense dashboard system (Fira Sans / Fira Code, blue + amber on a blue-biased neutral ground, both themes designed rather than inverted). Code is split into focused modules:

- `src/data.js` — programs, raw-figure annotations, and the **champions ledger**
- `src/scoring.js` — the era-weighted composite engine (incl. the vacated adjustment and heatmap blend)
- `src/theme.js` — the two theme token maps and font stacks
- `src/icons.jsx` — inline SVG icon set
- `src/App.jsx` — views and interaction

## Adding a future season

The **Champions** tab is designed to grow. As each national title becomes official, edit the `CHAMPIONS` array at the top of [`src/data.js`](src/data.js) — nothing else needs to change:

```js
// most recent season first
{ year: 2025, cfb: "Ohio State", cbb: "Florida" },  // fill in the CFB champ once decided
{ year: 2026, cfb: null,         cbb: null },        // null renders as an "awaiting result" row
```

Use a name that matches a program in `PROGRAMS` and the champion becomes a clickable cross-link to its Power Index profile. Push to `main` and the site redeploys automatically.

> **Data note:** National titles, Final Fours, and conference affiliation are high-confidence aggregates. Recruiting, poll-weeks, advanced metrics, pro production, and era-split win% are calibrated analyst estimates on a relative 0–100 scale — not exact sourced season figures.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

Built with [Vite](https://vitejs.dev/), [React](https://react.dev/), and [Recharts](https://recharts.org/).

## Deployment

Hosted on **GitHub Pages** at https://bh5msu-coder.github.io/CFBxCBB/. Every push to `main` rebuilds and republishes automatically via the [`Deploy to GitHub Pages`](.github/workflows/deploy.yml) workflow.
