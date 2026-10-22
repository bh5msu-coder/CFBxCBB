import { describe, it, expect } from "vitest";
import {
  hashStr, mulberry32, seededShuffle, PROFILES, PROFILE_BY_NAME, MODEL_RANK,
  dayNumber, dayKey, puzzleNumber, PUZZLE_EPOCH_DAY, msUntilMidnight,
  dailyTarget, MAX_GUESSES, evaluateGuess, CUE_KEYS, cellEmoji, hintsFor, shareText, searchProfiles, applyDailyResult,
  ELO_START, eloUpdate, pickDuel, eloRanking,
  pendingSlots, resolvePicks, eligibleFor,
  dailyTrivia, eraScores, movers, PRESETS, ACHIEVEMENTS, newlyEarned,
} from "./game.js";
import { CHAMPIONS, CANCELLED, FAMILIES, ERAS } from "./data.js";
import { DEFAULT_GAME } from "./store.js";

const D = (y, m, d) => new Date(y, m - 1, d, 12);

describe("seeded randomness", () => {
  it("hashStr and mulberry32 are deterministic", () => {
    expect(hashStr("abc")).toBe(hashStr("abc"));
    expect(hashStr("abc")).not.toBe(hashStr("abd"));
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("seededShuffle is a deterministic permutation", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = seededShuffle(arr, 7), s2 = seededShuffle(arr, 7);
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});

describe("canonical profiles", () => {
  it("builds a profile for every rated program with the fields the games need", () => {
    expect(PROFILES.length).toBeGreaterThan(60);
    for (const p of PROFILES) {
      expect(p.combined).not.toBeNull();
      expect(p.tier).toBeTruthy();
      expect(p.eraSeries).toHaveLength(ERAS.length);
      expect(["football", "basketball", "balanced"]).toContain(p.lean);
      for (const f of FAMILIES) expect(f.key in p.breakdown).toBe(true);
    }
  });
  it("model rank is a 1..N permutation with Ohio State on top", () => {
    const ranks = Object.values(MODEL_RANK).sort((a, b) => a - b);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
    expect(MODEL_RANK["Ohio State"]).toBe(1);
  });
});

describe("calendar", () => {
  it("numbers puzzles from the epoch day", () => {
    expect(puzzleNumber(D(2026, 10, 22))).toBe(1);
    expect(puzzleNumber(D(2026, 10, 23))).toBe(2);
    expect(dayNumber(D(2026, 10, 22))).toBe(PUZZLE_EPOCH_DAY);
    expect(dayKey(D(2026, 1, 5))).toBe("2026-01-05");
  });
  it("counts down to local midnight", () => {
    const ms = msUntilMidnight(new Date(2026, 0, 1, 23, 0, 0));
    expect(ms).toBe(60 * 60 * 1000);
  });
});

describe("daily Blind Rank", () => {
  it("is deterministic for a date and differs day to day without repeating across the field", () => {
    expect(dailyTarget(D(2026, 10, 22)).name).toBe(dailyTarget(D(2026, 10, 22)).name);
    const seen = new Set();
    for (let i = 0; i < PROFILES.length; i++) {
      seen.add(dailyTarget(D(2026, 10, 22 + i)).name);
    }
    expect(seen.size).toBe(PROFILES.length); // a full cycle has no repeats
  });
  it("evaluates a correct guess as all hits", () => {
    const t = PROFILE_BY_NAME["Duke"];
    const e = evaluateGuess(t, t);
    expect(e.correct).toBe(true);
    for (const k of CUE_KEYS) expect(e[k]).toBe("hit");
  });
  it("gives directional cues on a wrong guess", () => {
    const target = PROFILE_BY_NAME["Alabama"], guess = PROFILE_BY_NAME["Vanderbilt"] || PROFILE_BY_NAME["Nebraska"];
    const e = evaluateGuess(guess, target);
    expect(e.correct).toBe(false);
    expect(["hit", "near", "miss"]).toContain(e.tier);
    expect(["=", "higher", "lower"]).toContain(e.tierDir);
    expect(["=", "higher", "lower"]).toContain(e.titlesDir);
  });
  it("unlocks hints progressively and the share text has one row per guess", () => {
    const t = PROFILE_BY_NAME["Kansas"];
    expect(hintsFor(t, 0)).toHaveLength(0);
    expect(hintsFor(t, 5)).toHaveLength(5);
    expect(hintsFor(t, 1)[0]).toContain("Big 12");
    const evals = [evaluateGuess(PROFILE_BY_NAME["Duke"], t), evaluateGuess(t, t)];
    const txt = shareText(3, evals, true, "https://x");
    expect(txt.startsWith("CFB×CBB Blind Rank #3 2/" + MAX_GUESSES)).toBe(true);
    expect(txt.split("\n")).toHaveLength(4);
    expect(cellEmoji("hit")).toBe("🟩");
  });
  it("search is case-insensitive and capped", () => {
    expect(searchProfiles("duke")[0].name).toBe("Duke");
    expect(searchProfiles("a", 3)).toHaveLength(3);
    expect(searchProfiles("")).toHaveLength(0);
  });
  it("applyDailyResult extends a streak only on consecutive days", () => {
    let d = { ...DEFAULT_GAME.daily };
    d = applyDailyResult(d, 100, true, 3, "Duke");
    expect(d.streak).toBe(1); expect(d.wins).toBe(1); expect(d.solved.Duke).toBe(3);
    d = applyDailyResult(d, 101, true, 2, "Kansas");
    expect(d.streak).toBe(2); expect(d.maxStreak).toBe(2);
    d = applyDailyResult(d, 103, true, 1, "Duke"); // skipped a day → reset to 1
    expect(d.streak).toBe(1); expect(d.solved.Duke).toBe(1); // keeps best tries
    d = applyDailyResult(d, 104, false, 6, "UCLA");
    expect(d.streak).toBe(0); expect(d.maxStreak).toBe(2); expect(d.played).toBe(4);
  });
});

describe("duels / Elo", () => {
  it("transfers rating from loser to winner and is zero-sum", () => {
    const [a, b] = eloUpdate(1500, 1500, true);
    expect(a).toBeGreaterThan(1500); expect(b).toBeLessThan(1500);
    expect(a + b).toBeCloseTo(3000, 6);
  });
  it("an upset moves more rating than an expected win", () => {
    const [up] = eloUpdate(1400, 1600, true);
    const [exp] = eloUpdate(1600, 1400, true);
    expect(up - 1400).toBeGreaterThan(exp - 1600);
  });
  it("picks two distinct programs and honors an exclusion", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const [a, b] = pickDuel(rng, ["Duke", "Kansas"]);
      expect(a.name).not.toBe(b.name);
      expect(["Duke", "Kansas"]).not.toContain(a.name);
    }
  });
  it("ranks by Elo with model-rank deltas", () => {
    const r = eloRanking({ Gonzaga: 1700 });
    expect(r[0].name).toBe("Gonzaga");
    expect(r[0].rank).toBe(1);
    expect(r[0].delta).toBe(MODEL_RANK.Gonzaga - 1);
    expect(r).toHaveLength(PROFILES.length);
    expect(r.find((x) => x.name === "Duke").r).toBe(ELO_START);
  });
});

describe("Call the Title", () => {
  it("lists exactly the undecided ledger cells as slots", () => {
    const slots = pendingSlots();
    let expected = 0;
    for (const r of CHAMPIONS) { if (r.cfb == null) expected++; if (r.cbb == null) expected++; }
    expect(slots).toHaveLength(expected);
    expect(slots.map((s) => s.key)).toContain("2027-cbb");
  });
  it("resolves picks against decided rows and leaves undecided ones pending", () => {
    const { resolved, pending } = resolvePicks({ "2025-cfb": "Indiana", "2025-cbb": "Duke", "2027-cbb": "Kansas", "2020-cbb": "Baylor" });
    expect(resolved.find((r) => r.key === "2025-cfb").correct).toBe(true);
    expect(resolved.find((r) => r.key === "2025-cbb").correct).toBe(false);
    expect(resolved.find((r) => r.key === "2020-cbb").void).toBe(true); // cancelled season
    expect(pending.map((p) => p.key)).toEqual(["2027-cbb"]);
  });
  it("only offers programs that play the sport", () => {
    expect(eligibleFor("cfb")).not.toContain("Gonzaga");
    expect(eligibleFor("cbb")).toContain("Gonzaga");
  });
});

describe("daily trivia", () => {
  it("is deterministic per day and well-formed", () => {
    const a = dailyTrivia(D(2026, 10, 22)), b = dailyTrivia(D(2026, 10, 22));
    expect(a.map((q) => q.q)).toEqual(b.map((q) => q.q));
    expect(a).toHaveLength(5);
    for (const q of a) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain).toBeTruthy();
    }
  });
  it("varies across days", () => {
    const qs = new Set();
    for (let i = 0; i < 10; i++) dailyTrivia(D(2026, 10, 22 + i)).forEach((q) => qs.add(q.q));
    expect(qs.size).toBeGreaterThan(10);
  });
  it("answers are factually consistent with the ledger", () => {
    for (let i = 0; i < 30; i++) {
      for (const q of dailyTrivia(D(2026, 11, 1 + i))) {
        const m = q.q.match(/Who won the (football|basketball) national title for the (\d{4}) season\?/);
        if (m) {
          const row = CHAMPIONS.find((r) => r.year === Number(m[2]));
          expect(q.options[q.answer]).toBe(row[m[1] === "football" ? "cfb" : "cbb"]);
        }
      }
    }
  });
});

describe("time machine", () => {
  it("produces a ranked list per era with sequential ranks", () => {
    const eras = eraScores("combined");
    expect(eras).toHaveLength(ERAS.length);
    for (const e of eras) e.forEach((x, i) => expect(x.rank).toBe(i + 1));
  });
  it("movers computes rank deltas and flags new entrants", () => {
    const eras = eraScores("cbb");
    const m = movers(eras[0], eras[3]);
    const boise = m.find((x) => x.name === "Boise State");
    expect(boise.from).toBeNull(); // no 1976–89 data at all → new entrant by E4
    const dukeE1 = eras[0].find((x) => x.name === "Duke"), dukeE4 = eras[3].find((x) => x.name === "Duke");
    expect(m.find((x) => x.name === "Duke").delta).toBe(dukeE1.rank - dukeE4.rank);
  });
});

describe("personas & achievements", () => {
  it("presets have valid slider-range weights and at least one era", () => {
    for (const p of PRESETS) {
      for (const f of FAMILIES) { expect(p.weights[f.key]).toBeGreaterThanOrEqual(0); expect(p.weights[f.key]).toBeLessThanOrEqual(40); }
      expect(Object.values(p.eras).some(Boolean)).toBe(true);
      expect(p.recency).toBeGreaterThanOrEqual(0); expect(p.recency).toBeLessThanOrEqual(1);
    }
  });
  it("achievements have unique ids and unlock from state", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const fresh = structuredClone(DEFAULT_GAME);
    expect(newlyEarned(fresh)).toEqual([]);
    const s = structuredClone(DEFAULT_GAME);
    s.daily.wins = 1; s.daily.solved = { Duke: 1 };
    const got = newlyEarned(s);
    expect(got).toContain("first_win"); expect(got).toContain("ace");
    expect(got).toContain("blue"); // Duke is Blue Blood in basketball (peakTier), even though combined isn't
    s.badges = got;
    expect(newlyEarned(s)).toEqual([]); // already earned → not re-reported
  });
});
