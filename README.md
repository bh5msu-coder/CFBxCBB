# CFBxCBB

**CFB × CBB Power Index** — an interactive React app ranking college programs across 50 seasons (1976–2025) in both football and basketball.

**🔗 Live site: https://bh5msu-coder.github.io/CFBxCBB/**

Programs carry era-bucketed scores (1976–89 / 1990–99 / 2000–09 / 2010–25) across six metric families (Championships, Win %, Pro Production, Recruiting, Poll Presence, Advanced) per sport, on a relative 0–100 scale. The scoring engine re-aggregates live as you adjust era windows, recency weighting, and metric weights.

### Views
- **Ladder** — tiered rankings (Blue Blood / Elite / Power / Solid / Rising)
- **Quadrant** — two-sport scatter plot (football vs. basketball)
- **Heatmap** — sortable per-family breakdown table

### Features
- Sport toggle (Football / Basketball / Combined, with a two-sport balance bonus)
- Era-window selection + recency weighting
- Adjustable metric weights
- Conference filter, name search, and program spotlighting
- Vacated-results toggle (official vs. on-field)
- Per-program detail modal and a methodology panel

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
