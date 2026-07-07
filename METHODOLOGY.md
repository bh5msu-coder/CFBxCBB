# Methodology

How the **CFB × CBB Power Index** turns 50 seasons of program history into a single
0–100 score, what is hard data versus estimate, and where the model can be pushed
further. Reviewed and revalidated **July 2026**.

## The model in one paragraph

Each program carries, **per sport**, six metric *families* split into four *era buckets*.
Every cell is a **relative 0–100 score** (100 = best-in-class for that family over the
window). At render time the engine (`src/scoring.js`) averages the selected eras —
optionally recency-weighted — for each family, applies the family weights, and returns a
composite plus a per-family breakdown. Combined scores blend the two sports and add a
small two-sport balance bonus.

```
familyScore = weightedMeanOverSelectedEras(eraValues, recency) × officialFactor
sportScore  = Σ (familyScore × weight) / Σ weight
combined    = mean(cfbScore, cbbScore) + balanceBonus
```

## Families and default weights

| Family | Weight | What it proxies |
|---|---:|---|
| Championships | 30% | National titles, title-game/Final-Four appearances |
| Win % | 20% | Sustained on-field/on-court success |
| Poll Presence | 15% | Weeks ranked / sustained relevance |
| Pro Production | 15% | NFL/NBA draft pipeline |
| Recruiting | 10% | Incoming talent (data thins pre-2005) |
| Advanced | 10% | Efficiency-style quality (SP+/KenPom-flavored) |

The weights are **user-adjustable in the UI**, which is the model's main defense against
any single opinionated weighting: the default is a starting point, not a verdict.

## Era buckets

| Bucket | Years | Length |
|---|---|---:|
| E1 | 1976–89 | 14 |
| E2 | 1990–99 | 10 |
| E3 | 2000–09 | 10 |
| E4 | 2010–25 | 16 |

Because each cell is already normalized within its family, unequal bucket lengths don't
distort cross-program comparison; the recency slider lets a user tilt toward the modern
game.

## What is hard data vs. estimate

- **Hard data (high confidence):** national titles, Final Fours, conference/era
  affiliation, the **vacated-results flags**, and the season-by-season **champions ledger**
  (`CHAMPIONS`). The ledger was verified July 2026 against NCAA.com, ESPN, and CFP.com,
  including: Indiana's 2025 CFB title (def. Miami 27–21), Michigan's 2026 CBB title
  (def. UConn 69–63), and the **absence of a 2020 CBB champion** (tournament cancelled
  for COVID-19).
- **Calibrated estimates (flagged):** recruiting, poll-weeks, advanced, pro counts, and
  era-split win%. These are analyst approximations on a relative 0–100 scale — **not**
  exact sourced season figures, and are labeled as such in-app.

## Is this a defensible design?

Yes, for its stated purpose — a *legacy / all-time program* index rather than a
*predictive, this-week* rating. It is outcome-and-résumé weighted (titles, ranked weeks,
draft capital), which is the right family of inputs for "how great has this program been,"
and it is transparent and adjustable. The honest caveats:

1. **Championships (30%) and Poll Presence (15%) partly co-vary** — great teams get ranked
   *and* win titles — so the effective weight on "winning a lot" is higher than 30%. This
   is defensible for an all-time index (titles *should* dominate) but users should know it.
2. **No opponent adjustment / strength-of-schedule.** The estimates bake in era strength
   implicitly rather than deriving it. This is the single biggest gap versus predictive
   systems and is inherent to a hand-calibrated model.
3. **Estimate subjectivity.** The non-title families are analyst calls; two reasonable
   people would draw them differently. The 0–100 relative framing and the "estimate" labels
   are the mitigation.

## How established systems could inform improvements

| System | Core idea | What we could borrow |
|---|---|---|
| **Sagarin / Massey / SRS** | Solve a linear system so every rating is opponent-adjusted; margin-of-victory (capped) matters | Add an explicit, capped **strength-of-era** multiplier per bucket instead of folding it into estimates |
| **KenPom / SP+ / FEI** | Tempo-free efficiency (points per possession / per play), predictive not résumé-based | Keep the **Advanced** family honest by anchoring it to published efficiency ranks where they exist (2002→ for KenPom) |
| **AP poll-week counts** | Cumulative "weeks ranked" is a clean, sourceable longevity metric | Replace the **Poll Presence** estimate with actual cumulative ranked-weeks — this is one of the easier estimates to convert to hard data |
| **Massey composite** | Averages many independent systems to cut single-model bias | Frame our composite the same way and, longer term, ingest 2–3 external ranks per era as priors |

### Concrete, low-risk next steps (in priority order)

1. **Convert Poll Presence to sourced cumulative ranked-weeks.** Highest data-quality win
   for the least modeling risk; it's a countable figure.
2. **Add a per-era strength multiplier** (a single small, documented number per bucket)
   so opponent/era strength is explicit rather than implicit in every cell.
3. **Anchor the Advanced family to published efficiency ranks** (KenPom/SP+) for E3–E4,
   where they exist, and mark E1–E2 as estimate-only.
4. **Surface the champ/poll co-variance** in the UI methodology panel so users interpret
   the weights correctly.

None of these change the app's architecture: they upgrade individual cells in `data.js`
from estimate to sourced, exactly like the champions ledger already is.
