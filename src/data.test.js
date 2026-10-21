import { describe, it, expect } from "vitest";
import {
  CHAMPIONS, CANCELLED, PROGRAMS, ERAS, FAMILIES, TITLES, titlesFor, titleTotal,
  FAMILY_CONFIDENCE, CONFIDENCE, ERA_CONFIDENCE, POLL_ANCHORS,
} from "./data.js";

const NAMES = new Set(PROGRAMS.map((p) => p.name));
const byYear = Object.fromEntries(CHAMPIONS.map((r) => [r.year, r]));

describe("CHAMPIONS ledger integrity", () => {
  it("is ordered most-recent-first with unique years", () => {
    const years = CHAMPIONS.map((r) => r.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
    expect(new Set(years).size).toBe(years.length);
  });

  it("records the July-2026 verified recent champions", () => {
    expect(byYear[2025].cfb).toBe("Indiana");     // def. Miami 27–21 (Jan 2026)
    expect(byYear[2025].cbb).toBe("Florida");     // Apr 2025
    expect(byYear[2026].cbb).toBe("Michigan");    // def. UConn 69–63 (Apr 2026)
    expect(byYear[2024].cfb).toBe("Ohio State");  // Jan 2025
  });

  it("marks 2020 basketball as cancelled, not a champion", () => {
    expect(byYear[2020].cbb).toBe(CANCELLED);
    expect(byYear[2020].cfb).toBe("Alabama");     // CFB was played (Jan 2021)
  });

  it("credits Baylor exactly once (2021 only)", () => {
    const baylorYears = CHAMPIONS.filter((r) => r.cfb === "Baylor" || r.cbb === "Baylor").map((r) => r.year);
    expect(baylorYears).toEqual([2021]);
  });

  it("spans the full 1976–present model window", () => {
    const years = CHAMPIONS.map((r) => r.year);
    expect(Math.min(...years)).toBe(1976);
    expect(byYear[1976].cfb).toBe("Pittsburgh");   // NOT Michigan — verified
    expect(byYear[1976].cbb).toBe("Indiana");
    expect(byYear[1983].cbb).toBe("NC State");     // program name matches PROGRAMS
    expect(byYear[2004].cfb).toBe("USC");          // BCS title later vacated
  });

  it("uses only future/awaiting (null) or CANCELLED as non-name values", () => {
    for (const row of CHAMPIONS) {
      for (const v of [row.cfb, row.cbb]) {
        if (v == null || v === CANCELLED) continue;
        expect(typeof v).toBe("string");
      }
    }
  });

  // Champions that intentionally aren't rated programs — they render as plain
  // text (no cross-link), which is valid. Kept explicit so a typo in any OTHER
  // champion name still fails the guard below.
  const KNOWN_NON_PROGRAM = new Set(["Arkansas"]);

  it("every named champion is a rated program (cross-link) or a known exception", () => {
    for (const row of CHAMPIONS) {
      for (const v of [row.cfb, row.cbb]) {
        if (v == null || v === CANCELLED) continue;
        if (KNOWN_NON_PROGRAM.has(v)) continue;
        expect(NAMES.has(v), `${v} missing from PROGRAMS`).toBe(true);
      }
    }
  });
});

describe("title tally (derived from the ledger)", () => {
  it("counts a program's titles by sport, keeping the years", () => {
    expect(titlesFor("Alabama").cfb).toContain(2020);     // CFB-only program in the ledger
    expect(titlesFor("Alabama").cbb.length).toBe(0);
    expect(titlesFor("Florida").cfb).toContain(2006);     // Florida won both in 2006
    expect(titlesFor("Florida").cbb).toEqual(expect.arrayContaining([2006, 2007]));
    expect(titleTotal("Florida")).toBe(titlesFor("Florida").cfb.length + titlesFor("Florida").cbb.length);
  });
  it("never keys a tally to null or CANCELLED", () => {
    expect(TITLES[null]).toBeUndefined();
    expect(TITLES[CANCELLED]).toBeUndefined();
  });
  it("tally totals exactly match the decided cells in the ledger", () => {
    let decided = 0;
    for (const r of CHAMPIONS) for (const v of [r.cfb, r.cbb]) if (v && v !== CANCELLED) decided++;
    const summed = Object.values(TITLES).reduce((a, t) => a + t.cfb.length + t.cbb.length, 0);
    expect(summed).toBe(decided);
  });
  it("includes the non-program champion (Arkansas 1994) in the tally", () => {
    expect(titlesFor("Arkansas").cbb).toEqual([1994]);
  });
});

describe("confidence layer", () => {
  it("assigns a known confidence level to every metric family", () => {
    for (const f of FAMILIES) expect(CONFIDENCE[FAMILY_CONFIDENCE[f.key]], `${f.key}`).toBeTruthy();
  });
  it("assigns a known confidence level to every era", () => {
    for (const e of ERAS) expect(CONFIDENCE[ERA_CONFIDENCE[e.key]], `${e.key}`).toBeTruthy();
  });
  it("marks poll as an anchored estimate and champ as hard data", () => {
    expect(FAMILY_CONFIDENCE.poll).toBe("anchor");
    expect(FAMILY_CONFIDENCE.champ).toBe("high");
  });
});

describe("poll ordering is consistent with the sourced AP anchors", () => {
  const meanPoll = (p, sport) => {
    const a = p[sport]?.poll;
    if (!a) return null;
    const v = a.filter((x) => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  for (const sport of ["cfb", "cbb"]) {
    it(`${sport} anchors sit in the top tier of the poll family`, () => {
      const ranked = PROGRAMS.map((p) => ({ name: p.name, m: meanPoll(p, sport) }))
        .filter((x) => x.m != null).sort((a, b) => b.m - a.m);
      const top = new Set(ranked.slice(0, 12).map((x) => x.name));
      for (const a of POLL_ANCHORS[sport]) {
        expect(top.has(a), `${a} should rank top-12 in ${sport} poll presence`).toBe(true);
      }
    });
  }
});
