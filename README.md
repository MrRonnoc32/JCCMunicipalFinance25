# How Jacksonville Pays for Itself

An interactive, single-page story about how Jacksonville's consolidated government raises and spends money. It compares Jacksonville with 13 peer governments and 14 top-ranked U.S. cities, using fiscal year 2025 audited financial reports.

Published by the Jacksonville Civic Council Research Office. It is based on *How Jacksonville Pays for Itself: A Peer-City Comparison of Municipal Finances, Fiscal Year 2025*, version 4 (October 2026).

## What's in the repo

| File | Purpose |
|---|---|
| `index.html` | Page content: the flow chart, three chapters, and sources |
| `assets/styles.css` | All styling (light theme, WCAG AAA text contrast) |
| `assets/app.js` | Charts and interactions (plain JavaScript, no libraries) |
| `assets/data.js` | FY2025 per-resident figures for every government shown |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

There is no build step. Open `index.html` in a browser to preview it locally.

## Publishing with GitHub Pages

1. In the repo on GitHub, go to **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to "Deploy from a branch".
3. Pick the `main` branch and the `/ (root)` folder, then save.
4. The site appears at `https://<your-username>.github.io/JCCMunicipalFinance25/` within a minute or two.

## Updating the numbers

- **Peer, top-tier, and per-resident figures** live in `assets/data.js`. They come from the v4 analysis tables (`gov_metrics.csv`, `oxford_per_resident.csv`, `oxford_fiscal_effort.csv`, `v4_oxford_rpp.csv`, `net_position_gov.csv`). Regenerate the file from those tables. Don't edit single values by hand.
- **The Sankey diagram** uses Jacksonville's FY2025 statement of activities (governmental activities). Those dollar amounts are in the `FLOW` object near the middle of `assets/app.js`.
- **Headline numbers in the text** (for example $2,069, 47.6%, $3,747) are written into `index.html`. Check them against the data whenever the data changes.

## Data notes and limits

- All figures cover governmental activities only. K-12 schools and city-owned utilities such as JEA are excluded.
- Each peer city is paired with its county. County amounts are scaled by the city's share of county population.
- Price-adjusted figures use the BEA Regional Price Parities for 2024.
- FY2025 function totals reflect a reassignment of about $300 million between functions compared with FY2024 (see the caution on the page).
- The study measures spending and revenue. It does not measure service quality or outcomes.

## Accessibility

- Every chart has a data-table view, keyboard focus, and a live text summary.
- Controls are at least 44 pixels tall.
- Body text meets WCAG AAA contrast (7:1).
- Motion is reduced when the reader's system asks for it.
