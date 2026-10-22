import { ERAS, FAMILIES, VACATED_OFFICIAL_FACTOR } from "./data.js";

// ---------------------------------------------------------------------------
// SCORING ENGINE
// ---------------------------------------------------------------------------
export function eraWeights(selectedEras, recency) {
  // recency 0 = equal weight, 1 = heavy recent. Decay applied across era index.
  const base = ERAS.map((e) => (selectedEras[e.key] ? 1 : 0));
  if (recency === 0) return base;
  const decay = 1 + recency * 2.2;
  return base.map((b, i) => b * Math.pow(decay, i));
}

// A vacated program's record-of-achievement families are reduced in OFFICIAL
// mode (vacated titles/wins removed) and restored in ON-FIELD mode.
function officialFactor(prog, famKey, onField) {
  if (onField || !prog.vacated) return 1;
  return VACATED_OFFICIAL_FACTOR[famKey] ?? 1;
}

export function programFamilyScore(prog, sport, fam, selectedEras, recency, onField) {
  const arr = prog[sport] ? prog[sport][fam] : null;
  if (!arr) return null;
  const w = eraWeights(selectedEras, recency);
  let num = 0, den = 0;
  arr.forEach((v, i) => {
    if (v == null) return;
    num += v * w[i];
    den += w[i];
  });
  if (den === 0) return null;
  return (num / den) * officialFactor(prog, fam, onField);
}

export function computeSportScore(prog, sport, weights, selectedEras, recency, onField) {
  if (!prog[sport]) return null;
  let total = 0, wsum = 0;
  const breakdown = {};
  FAMILIES.forEach((f) => {
    const s = programFamilyScore(prog, sport, f.key, selectedEras, recency, onField);
    breakdown[f.key] = s;
    if (s == null) return;
    total += s * weights[f.key];
    wsum += weights[f.key];
  });
  if (wsum === 0) return null;
  return { score: total / wsum, breakdown };
}

// Two-sport composite. Mean of CFB & CBB plus a balance bonus (up to +6) that
// rewards being strong in BOTH; a single-sport program takes a 0.92 factor so
// it can't dominate the combined board on one leg. Shared by the live board
// and the Play layer's canonical profiles so the two never drift.
export function combinedScore(cfb, cbb) {
  if (cfb != null && cbb != null) {
    const avg = (cfb + cbb) / 2;
    const balanceBonus = (Math.min(cfb, cbb) / 100) * 6;
    return { score: Math.min(100, avg + balanceBonus), balanceBonus };
  }
  if (cfb != null) return { score: cfb * 0.92, balanceBonus: 0 };
  if (cbb != null) return { score: cbb * 0.92, balanceBonus: 0 };
  return { score: null, balanceBonus: 0 };
}

// Per-family blend of the two sports — used so the Heatmap's family columns
// reconcile with the Combined score column (fixes the CFB-only mismatch).
export function blendBreakdown(cfbBreak, cbbBreak) {
  const out = {};
  FAMILIES.forEach((f) => {
    const a = cfbBreak?.[f.key];
    const b = cbbBreak?.[f.key];
    if (a != null && b != null) out[f.key] = (a + b) / 2;
    else if (a != null) out[f.key] = a;
    else if (b != null) out[f.key] = b;
    else out[f.key] = null;
  });
  return out;
}

// Per-family point contribution to the weighted composite. Each family's share
// is value × weight / Σ(weights of non-null families), so the contributions sum
// exactly to computeSportScore's score — letting the UI show how the number is
// built instead of asking users to take it on faith.
export function contributions(breakdown, weights) {
  let wsum = 0;
  FAMILIES.forEach((f) => { if (breakdown?.[f.key] != null) wsum += weights[f.key]; });
  const out = {};
  FAMILIES.forEach((f) => {
    const v = breakdown?.[f.key];
    out[f.key] = v == null || wsum === 0 ? null : (v * weights[f.key]) / wsum;
  });
  return out;
}

export function tierFor(score) {
  if (score == null) return null;
  if (score >= 82) return "Blue Blood";
  if (score >= 70) return "Elite";
  if (score >= 58) return "Power";
  if (score >= 45) return "Solid";
  return "Rising";
}

export const TIER_ORDER = ["Blue Blood", "Elite", "Power", "Solid", "Rising"];

// Tier accents are picked to hold ≥3:1 contrast on both the dark and light
// grounds defined in theme.js; the tier name always accompanies the color so
// meaning never rests on hue alone.
export const TIER_META = {
  "Blue Blood": { color: "#f5b301", order: 0 },
  Elite: { color: "#3b82f6", order: 1 },
  Power: { color: "#10b981", order: 2 },
  Solid: { color: "#8b5cf6", order: 3 },
  Rising: { color: "#64748b", order: 4 },
};
