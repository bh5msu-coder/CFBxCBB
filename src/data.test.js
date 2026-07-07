import { describe, it, expect } from "vitest";
import { CHAMPIONS, CANCELLED, PROGRAMS } from "./data.js";

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
