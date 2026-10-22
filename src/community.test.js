import { describe, it, expect } from "vitest";
import { PROFILES } from "./game.js";
import { totalDuels, enabled } from "./community.js";
import { COMMUNITY } from "./community.config.js";
import snapshot from "../supabase/cfbxcbb_programs.json";

describe("community allowlist stays in sync with the client", () => {
  // The server's cfbxcbb_programs table rejects any name not in its allowlist.
  // This snapshot is what was seeded; if data.js gains a program, regenerate
  // supabase/cfbxcbb_programs.json and add the name on the server too.
  it("every program the client can send is in the seeded allowlist", () => {
    const names = PROFILES.map((p) => p.name).sort();
    expect(names).toEqual(snapshot);
  });
});

describe("community client", () => {
  it("is configured with a publishable (not secret) key", () => {
    expect(enabled()).toBe(true);
    expect(COMMUNITY.url).toMatch(/^https:\/\/[a-z]+\.supabase\.co$/);
    expect(COMMUNITY.key).toMatch(/^sb_publishable_/);
  });
  it("counts duels as half the summed per-program votes", () => {
    expect(totalDuels([{ votes: 3 }, { votes: 3 }, { votes: 2 }])).toBe(4);
    expect(totalDuels(null)).toBe(0);
  });
});
