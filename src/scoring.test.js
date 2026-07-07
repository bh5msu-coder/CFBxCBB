import { describe, it, expect } from "vitest";
import {
  eraWeights, programFamilyScore, computeSportScore, blendBreakdown, tierFor, TIER_ORDER,
} from "./scoring.js";
import { DEFAULT_WEIGHTS, VACATED_OFFICIAL_FACTOR } from "./data.js";

const ALL_ERAS = { E1: true, E2: true, E3: true, E4: true };

describe("tierFor", () => {
  it("maps scores to the right tier boundaries", () => {
    expect(tierFor(82)).toBe("Blue Blood");
    expect(tierFor(81.9)).toBe("Elite");
    expect(tierFor(70)).toBe("Elite");
    expect(tierFor(58)).toBe("Power");
    expect(tierFor(45)).toBe("Solid");
    expect(tierFor(44.9)).toBe("Rising");
    expect(tierFor(0)).toBe("Rising");
  });
  it("returns null for null score", () => {
    expect(tierFor(null)).toBeNull();
  });
  it("only produces known tiers", () => {
    for (let s = 0; s <= 100; s += 0.5) expect(TIER_ORDER).toContain(tierFor(s));
  });
});

describe("eraWeights", () => {
  it("is all-ones with every era selected and no recency", () => {
    expect(eraWeights(ALL_ERAS, 0)).toEqual([1, 1, 1, 1]);
  });
  it("zeroes out deselected eras", () => {
    expect(eraWeights({ E1: true, E2: false, E3: false, E4: true }, 0)).toEqual([1, 0, 0, 1]);
  });
  it("weights later eras more as recency rises", () => {
    const w = eraWeights(ALL_ERAS, 1);
    expect(w[3]).toBeGreaterThan(w[0]);
    expect(w[2]).toBeGreaterThan(w[1]);
  });
});

describe("programFamilyScore", () => {
  const prog = { cfb: { champ: [40, 60, 80, 100] } };
  it("averages era values with equal weighting", () => {
    expect(programFamilyScore(prog, "cfb", "champ", ALL_ERAS, 0, false)).toBe(70);
  });
  it("skips null era entries", () => {
    const p = { cfb: { champ: [null, 60, 80, 100] } };
    expect(programFamilyScore(p, "cfb", "champ", ALL_ERAS, 0, false)).toBe(80);
  });
  it("returns null when the sport or family is absent", () => {
    expect(programFamilyScore(prog, "cbb", "champ", ALL_ERAS, 0, false)).toBeNull();
    expect(programFamilyScore(prog, "cfb", "winpct", ALL_ERAS, 0, false)).toBeNull();
  });
  it("returns null when no era is selected", () => {
    expect(programFamilyScore(prog, "cfb", "champ", { E1: false, E2: false, E3: false, E4: false }, 0, false)).toBeNull();
  });
});

describe("vacated official factor", () => {
  const vac = { vacated: true, cfb: { champ: [100, 100, 100, 100], winpct: [100, 100, 100, 100], pro: [100, 100, 100, 100] } };
  it("reduces champ/winpct in official mode and restores them on-field", () => {
    const official = programFamilyScore(vac, "cfb", "champ", ALL_ERAS, 0, false);
    const onField = programFamilyScore(vac, "cfb", "champ", ALL_ERAS, 0, true);
    expect(official).toBeCloseTo(100 * VACATED_OFFICIAL_FACTOR.champ, 6);
    expect(onField).toBe(100);
    expect(official).toBeLessThan(onField);
  });
  it("leaves non-adjusted families (pro) untouched", () => {
    expect(programFamilyScore(vac, "cfb", "pro", ALL_ERAS, 0, false)).toBe(100);
  });
  it("does not touch non-vacated programs", () => {
    const clean = { cfb: { champ: [100, 100, 100, 100] } };
    expect(programFamilyScore(clean, "cfb", "champ", ALL_ERAS, 0, false)).toBe(100);
  });
});

describe("computeSportScore", () => {
  it("returns null when the sport is missing", () => {
    expect(computeSportScore({ cbb: {} }, "cfb", DEFAULT_WEIGHTS, ALL_ERAS, 0, false)).toBeNull();
  });
  it("returns a score and a per-family breakdown", () => {
    const p = { cfb: { champ: [50, 50, 50, 50], winpct: [70, 70, 70, 70], pro: [60, 60, 60, 60], recruit: [80, 80, 80, 80], poll: [40, 40, 40, 40], adv: [90, 90, 90, 90] } };
    const r = computeSportScore(p, "cfb", DEFAULT_WEIGHTS, ALL_ERAS, 0, false);
    expect(r.breakdown.champ).toBe(50);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("blendBreakdown", () => {
  it("averages families present in both sports", () => {
    const out = blendBreakdown({ champ: 40, winpct: 80 }, { champ: 60, winpct: 20 });
    expect(out.champ).toBe(50);
    expect(out.winpct).toBe(50);
  });
  it("falls back to the single available sport", () => {
    const out = blendBreakdown({ champ: 40 }, { champ: null, winpct: 30 });
    expect(out.champ).toBe(40);
    expect(out.winpct).toBe(30);
  });
});
