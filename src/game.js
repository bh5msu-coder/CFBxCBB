// ============================================================================
// PLAY LAYER — pure game logic (no React, no storage). Everything here is
// deterministic given its inputs so it can be unit-tested, and it runs only on
// the verified data already in data.js — no new facts are introduced.
// ============================================================================
import { ACTIVE, ERAS, DEFAULT_WEIGHTS, CHAMPIONS, CANCELLED, titlesFor } from "./data.js";
import { computeSportScore, blendBreakdown, combinedScore, tierFor, TIER_ORDER } from "./scoring.js";

export const ALL_ERAS = Object.fromEntries(ERAS.map((e) => [e.key, true]));
const onlyEra = (key) => Object.fromEntries(ERAS.map((e) => [e.key, e.key === key]));

// ---- Seeded randomness -----------------------------------------------------
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seededShuffle(arr, seed) {
  const r = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- Canonical profiles ----------------------------------------------------
// Fixed-model snapshot (default weights, all eras, official mode) so puzzles,
// duels and the time machine don't shift when a user drags the live sliders.
function canon(p) {
  const cfb = computeSportScore(p, "cfb", DEFAULT_WEIGHTS, ALL_ERAS, 0, false);
  const cbb = computeSportScore(p, "cbb", DEFAULT_WEIGHTS, ALL_ERAS, 0, false);
  const combined = combinedScore(cfb?.score ?? null, cbb?.score ?? null).score;
  const breakdown = cfb && cbb ? blendBreakdown(cfb.breakdown, cbb.breakdown) : (cfb?.breakdown || cbb?.breakdown || {});
  const eraSeries = ERAS.map((e) => {
    const sel = onlyEra(e.key);
    const a = computeSportScore(p, "cfb", DEFAULT_WEIGHTS, sel, 0, false);
    const b = computeSportScore(p, "cbb", DEFAULT_WEIGHTS, sel, 0, false);
    return combinedScore(a?.score ?? null, b?.score ?? null).score;
  });
  const titles = titlesFor(p.name);
  const lean = cfb && cbb
    ? (cfb.score - cbb.score > 12 ? "football" : cbb.score - cfb.score > 12 ? "basketball" : "balanced")
    : cfb ? "football" : "basketball";
  // `tier` tracks the combined board; `peakTier` is the program's best single
  // sport (combined rarely reaches Blue Blood, so collection badges use peak).
  const tiers = [cfb?.score, cbb?.score].filter((s) => s != null).map(tierFor);
  const peakTier = tiers.sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))[0] ?? tierFor(combined);
  return {
    name: p.name, conf: p.conf, vacated: !!p.vacated,
    cfb: cfb?.score ?? null, cbb: cbb?.score ?? null, combined, breakdown, eraSeries,
    tier: tierFor(combined), peakTier, titles, titleTotal: titles.cfb.length + titles.cbb.length, lean,
  };
}
export const PROFILES = ACTIVE.map(canon).filter((p) => p.combined != null);
export const PROFILE_BY_NAME = Object.fromEntries(PROFILES.map((p) => [p.name, p]));
export const MODEL_RANK = Object.fromEntries(
  [...PROFILES].sort((a, b) => b.combined - a.combined).map((p, i) => [p.name, i + 1]),
);

// ---- Calendar --------------------------------------------------------------
// Local-date based so "today's puzzle" flips at the player's midnight.
export const PUZZLE_EPOCH_DAY = Math.floor(Date.UTC(2026, 9, 22) / 86400000); // 2026-10-22 = Blind Rank #1
export function dayNumber(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function puzzleNumber(d = new Date()) { return dayNumber(d) - PUZZLE_EPOCH_DAY + 1; }
export function msUntilMidnight(d = new Date()) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next - d;
}

// ---- Daily Blind Rank ------------------------------------------------------
// A seeded permutation of the field walked one program per day: deterministic
// for everyone, and no repeats until the whole field has been used.
const CYCLE = seededShuffle(PROFILES.map((p) => p.name), hashStr("blind-rank-v1"));
export function dailyTarget(d = new Date()) {
  const n = puzzleNumber(d);
  const idx = (((n - 1) % CYCLE.length) + CYCLE.length) % CYCLE.length;
  return PROFILE_BY_NAME[CYCLE[idx]];
}
export const MAX_GUESSES = 6;

const tierIdx = (t) => TIER_ORDER.indexOf(t); // 0 = Blue Blood (best)
export function evaluateGuess(guess, target) {
  if (!guess || !target) return null;
  const dt = tierIdx(guess.tier) - tierIdx(target.tier); // >0 ⇒ target is the better tier
  const dTitles = target.titleTotal - guess.titleTotal;
  const dScore = target.combined - guess.combined;
  return {
    correct: guess.name === target.name,
    conf: guess.conf === target.conf ? "hit" : "miss",
    tier: dt === 0 ? "hit" : Math.abs(dt) === 1 ? "near" : "miss",
    tierDir: dt === 0 ? "=" : dt > 0 ? "higher" : "lower",
    titles: dTitles === 0 ? "hit" : Math.abs(dTitles) <= 1 ? "near" : "miss",
    titlesDir: dTitles === 0 ? "=" : dTitles > 0 ? "higher" : "lower",
    lean: guess.lean === target.lean ? "hit" : "miss",
    score: Math.abs(dScore) < 3 ? "hit" : Math.abs(dScore) <= 8 ? "near" : "miss",
    scoreDir: Math.abs(dScore) < 3 ? "=" : dScore > 0 ? "higher" : "lower",
  };
}
export const CUE_KEYS = ["conf", "tier", "titles", "lean", "score"];
export const cellEmoji = (v) => (v === "hit" ? "🟩" : v === "near" ? "🟨" : "⬛");
export function hintsFor(target, wrongCount) {
  const h = [];
  if (wrongCount >= 1) h.push(`Conference: ${target.conf}`);
  if (wrongCount >= 2) h.push(`Leans ${target.lean}`);
  if (wrongCount >= 3) h.push(`Tier: ${target.tier}`);
  if (wrongCount >= 4) h.push(`Titles in window: ${target.titleTotal}`);
  if (wrongCount >= 5) h.push(`Starts with "${target.name[0]}"`);
  return h;
}
export function shareText(num, evals, won, url) {
  const rows = evals.map((e) => CUE_KEYS.map((k) => cellEmoji(e[k])).join("")).join("\n");
  return `CFB×CBB Blind Rank #${num} ${won ? evals.length : "X"}/${MAX_GUESSES}\n${rows}\n${url}`;
}
export function searchProfiles(q, limit = 8) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return PROFILES.filter((p) => p.name.toLowerCase().includes(s)).slice(0, limit);
}

// Streak bookkeeping. Returns the next `daily` slice after a finished game.
export function applyDailyResult(daily, day, won, tries, targetName) {
  const d = { ...daily, solved: { ...daily.solved } };
  d.played += 1;
  if (won) {
    d.wins += 1;
    d.streak = daily.lastWonDay === day - 1 ? daily.streak + 1 : 1;
    d.lastWonDay = day;
    d.maxStreak = Math.max(d.maxStreak, d.streak);
    if (d.solved[targetName] == null || tries < d.solved[targetName]) d.solved[targetName] = tries;
  } else {
    d.streak = 0;
  }
  return d;
}

// ---- Duels / Elo -----------------------------------------------------------
export const ELO_START = 1500;
export function eloUpdate(ra, rb, aWins, K = 32) {
  const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
  const sa = aWins ? 1 : 0;
  return [ra + K * (sa - ea), rb + K * (1 - sa - (1 - ea))];
}
export function pickDuel(rng = Math.random, exclude = null) {
  const pool = PROFILES.filter((p) => !exclude || (p.name !== exclude[0] && p.name !== exclude[1]));
  const a = pool[Math.floor(rng() * pool.length)];
  // Half the time, pick a close matchup (±14 model points) so votes are interesting.
  if (rng() < 0.5) {
    const near = pool.filter((p) => p.name !== a.name && Math.abs(p.combined - a.combined) <= 14);
    if (near.length) return [a, near[Math.floor(rng() * near.length)]];
  }
  let b = a;
  while (b.name === a.name) b = pool[Math.floor(rng() * pool.length)];
  return [a, b];
}
export function eloRanking(elo) {
  return PROFILES.map((p) => ({ name: p.name, r: elo[p.name] ?? ELO_START, modelRank: MODEL_RANK[p.name] }))
    .sort((a, b) => b.r - a.r || a.modelRank - b.modelRank)
    .map((x, i) => ({ ...x, rank: i + 1, delta: x.modelRank - (i + 1) }));
}

// ---- Call the Title (predictions) -----------------------------------------
export function pendingSlots() {
  const out = [];
  for (const r of CHAMPIONS) {
    if (r.cfb == null) out.push({ key: `${r.year}-cfb`, year: r.year, sport: "cfb" });
    if (r.cbb == null) out.push({ key: `${r.year}-cbb`, year: r.year, sport: "cbb" });
  }
  return out.sort((a, b) => a.year - b.year || a.sport.localeCompare(b.sport));
}
// Picks: { "2026-cfb": "Ohio State" }. Resolves against the ledger as it fills in.
export function resolvePicks(picks) {
  const byYear = Object.fromEntries(CHAMPIONS.map((r) => [r.year, r]));
  const resolved = [], pending = [];
  for (const [key, pick] of Object.entries(picks)) {
    const [y, sport] = key.split("-");
    const row = byYear[Number(y)];
    const actual = row ? row[sport] : undefined;
    if (actual == null) pending.push({ key, year: Number(y), sport, pick });
    else if (actual === CANCELLED) resolved.push({ key, year: Number(y), sport, pick, actual, void: true, correct: false });
    else resolved.push({ key, year: Number(y), sport, pick, actual, correct: actual === pick });
  }
  return { resolved: resolved.sort((a, b) => b.year - a.year), pending: pending.sort((a, b) => a.year - b.year) };
}
export function eligibleFor(sport) {
  return PROFILES.filter((p) => (sport === "cfb" ? p.cfb != null : p.cbb != null)).map((p) => p.name).sort();
}

// ---- Trivia (daily, seeded, generated from the ledger) ----------------------
const decidedRows = () => CHAMPIONS.filter((r) => (r.cfb && r.cfb !== CANCELLED) || (r.cbb && r.cbb !== CANCELLED));
const sportWord = (s) => (s === "cfb" ? "football" : "basketball");
function uniqueFill(rng, answer, poolFn, n = 3) {
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 400) { const v = poolFn(); if (v != null && v !== answer) out.add(v); }
  return [...out];
}
function finish(rng, q, answer, distractors, explain) {
  const options = seededShuffle([answer, ...distractors], Math.floor(rng() * 1e9));
  return { q, options, answer: options.indexOf(answer), explain };
}
export function dailyTrivia(d = new Date(), count = 5) {
  const rng = mulberry32(hashStr("trivia-v1-" + dayKey(d)));
  const rows = decidedRows();
  const champsOf = (sport) => [...new Set(rows.map((r) => r[sport]).filter((v) => v && v !== CANCELLED))];
  const titled = (sport) => PROFILES.filter((p) => titlesFor(p.name)[sport].length > 0);
  const untitled = (sport) => PROFILES.filter((p) => (sport === "cfb" ? p.cfb != null : p.cbb != null) && titlesFor(p.name)[sport].length === 0);
  const years = rows.map((r) => r.year);
  const gens = [
    () => { // year → champion
      const sport = rng() < 0.5 ? "cfb" : "cbb";
      const cand = rows.filter((r) => r[sport] && r[sport] !== CANCELLED);
      const r = cand[Math.floor(rng() * cand.length)];
      const pool = champsOf(sport);
      return finish(rng, `Who won the ${sportWord(sport)} national title for the ${r.year} season?`, r[sport],
        uniqueFill(rng, r[sport], () => pool[Math.floor(rng() * pool.length)]),
        `${r[sport]} — ${r.year} ${sportWord(sport)} champion.`);
    },
    () => { // program → title count
      const sport = rng() < 0.5 ? "cfb" : "cbb";
      const pool = titled(sport);
      const p = pool[Math.floor(rng() * pool.length)];
      const n = titlesFor(p.name)[sport].length;
      return finish(rng, `How many ${sportWord(sport)} national titles does ${p.name} have in the window (1976–present)?`, String(n),
        uniqueFill(rng, String(n), () => String(Math.max(0, n + (Math.floor(rng() * 7) - 3)))),
        `${p.name}: ${titlesFor(p.name)[sport].join(", ")}.`);
    },
    () => { // most recent title year
      const sport = rng() < 0.5 ? "cfb" : "cbb";
      const pool = titled(sport);
      const p = pool[Math.floor(rng() * pool.length)];
      const ys = titlesFor(p.name)[sport];
      const ans = String(Math.max(...ys));
      return finish(rng, `When did ${p.name} most recently win a ${sportWord(sport)} national title?`, ans,
        uniqueFill(rng, ans, () => String(years[Math.floor(rng() * years.length)])),
        `${p.name}'s ${sportWord(sport)} titles: ${ys.join(", ")}.`);
    },
    () => { // which has NO title
      const sport = rng() < 0.5 ? "cfb" : "cbb";
      const yes = titled(sport), no = untitled(sport);
      const ans = no[Math.floor(rng() * no.length)].name;
      return finish(rng, `Which of these programs has NO ${sportWord(sport)} national title in the window?`, ans,
        uniqueFill(rng, ans, () => yes[Math.floor(rng() * yes.length)].name),
        `${ans} has no ${sportWord(sport)} title since 1976; the others all do.`);
    },
  ];
  // The one program to sweep both titles in a season is a fixed fact worth asking.
  const sweep = rows.filter((r) => r.cfb && r.cbb && r.cfb !== CANCELLED && r.cbb === r.cfb);
  if (sweep.length) gens.push(() => {
    const r = sweep[Math.floor(rng() * sweep.length)];
    const pool = PROFILES.filter((p) => p.name !== r.cfb && p.cfb != null && p.cbb != null);
    return finish(rng, `Which program won BOTH the football and basketball national titles in the same season?`, r.cfb,
      uniqueFill(rng, r.cfb, () => pool[Math.floor(rng() * pool.length)].name),
      `${r.cfb} swept both titles in ${r.year}.`);
  });
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 60) {
    const q = gens[Math.floor(rng() * gens.length)]();
    if (q.options.length === 4 && !seen.has(q.q)) { seen.add(q.q); out.push(q); }
  }
  return out;
}

// ---- Time Machine ----------------------------------------------------------
export function eraScores(sport = "combined") {
  return ERAS.map((e) => {
    const sel = onlyEra(e.key);
    return ACTIVE.map((p) => {
      const a = computeSportScore(p, "cfb", DEFAULT_WEIGHTS, sel, 0, false);
      const b = computeSportScore(p, "cbb", DEFAULT_WEIGHTS, sel, 0, false);
      const score = sport === "cfb" ? a?.score ?? null : sport === "cbb" ? b?.score ?? null
        : combinedScore(a?.score ?? null, b?.score ?? null).score;
      return { name: p.name, conf: p.conf, score };
    }).filter((x) => x.score != null).sort((x, y) => y.score - x.score).map((x, i) => ({ ...x, rank: i + 1 }));
  });
}
export function movers(eraA, eraB) {
  const ra = Object.fromEntries(eraA.map((x) => [x.name, x]));
  return eraB.map((b) => {
    const a = ra[b.name];
    if (!a) return { name: b.name, from: null, to: b.rank, delta: null, scoreDelta: null };
    return { name: b.name, from: a.rank, to: b.rank, delta: a.rank - b.rank, scoreDelta: b.score - a.score };
  });
}

// ---- Personas (Build Your Index) ------------------------------------------
export const PRESETS = [
  { key: "balanced", label: "Balanced", desc: "The default model", weights: { ...DEFAULT_WEIGHTS }, eras: ALL_ERAS, recency: 0 },
  { key: "rings", label: "Ring Chaser", desc: "Titles are all that matter", weights: { champ: 40, winpct: 20, pro: 10, recruit: 5, poll: 15, adv: 10 }, eras: ALL_ERAS, recency: 0 },
  { key: "recruit", label: "Recruiting Truther", desc: "Talent acquisition rules", weights: { champ: 15, winpct: 15, pro: 20, recruit: 30, poll: 10, adv: 10 }, eras: ALL_ERAS, recency: 0.3 },
  { key: "oldhead", label: "Old Head", desc: "1976–99 was the real era", weights: { ...DEFAULT_WEIGHTS }, eras: { E1: true, E2: true, E3: false, E4: false }, recency: 0 },
  { key: "modern", label: "Modern Era", desc: "CFP / KenPom era, recency-heavy", weights: { ...DEFAULT_WEIGHTS }, eras: { E1: false, E2: false, E3: true, E4: true }, recency: 0.8 },
  { key: "nerd", label: "Analytics Nerd", desc: "Advanced metrics + win% first", weights: { champ: 15, winpct: 30, pro: 10, recruit: 5, poll: 10, adv: 30 }, eras: ALL_ERAS, recency: 0.4 },
];

// ---- Achievements ----------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: "first_win", label: "First Blood", desc: "Solve your first Blind Rank", test: (s) => s.daily.wins >= 1 },
  { id: "ace", label: "Ace", desc: "Solve a Blind Rank in one guess", test: (s) => Object.values(s.daily.solved).some((n) => n === 1) },
  { id: "quick", label: "Quick Read", desc: "Solve in two guesses or fewer", test: (s) => Object.values(s.daily.solved).some((n) => n <= 2) },
  { id: "streak3", label: "On a Run", desc: "3-day win streak", test: (s) => s.daily.maxStreak >= 3 },
  { id: "streak7", label: "Week Warrior", desc: "7-day win streak", test: (s) => s.daily.maxStreak >= 7 },
  { id: "streak30", label: "Ironman", desc: "30-day win streak", test: (s) => s.daily.maxStreak >= 30 },
  { id: "blue", label: "Blue Blood Hunter", desc: "Solve a program that's Blue Blood in a sport", test: (s) => Object.keys(s.daily.solved).some((n) => PROFILE_BY_NAME[n]?.peakTier === "Blue Blood") },
  { id: "rising", label: "Deep Cut", desc: "Solve a Rising-tier program", test: (s) => Object.keys(s.daily.solved).some((n) => PROFILE_BY_NAME[n]?.tier === "Rising") },
  { id: "collect10", label: "Collector", desc: "Unlock 10 program cards", test: (s) => Object.keys(s.daily.solved).length >= 10 },
  { id: "collect25", label: "Curator", desc: "Unlock 25 program cards", test: (s) => Object.keys(s.daily.solved).length >= 25 },
  { id: "duel50", label: "Hot Takes", desc: "Cast 50 duel votes", test: (s) => s.duels.votes >= 50 },
  { id: "duel200", label: "Commissioner", desc: "Cast 200 duel votes", test: (s) => s.duels.votes >= 200 },
  { id: "oracle", label: "Oracle", desc: "Correctly call a national champion", test: (s) => s.predict.correct >= 1 },
  { id: "historian", label: "Historian", desc: "Ace a daily trivia set", test: (s) => s.trivia.perfectDays >= 1 },
  { id: "archivist", label: "Archivist", desc: "Five perfect trivia days", test: (s) => s.trivia.perfectDays >= 5 },
];
export function newlyEarned(state) {
  const have = new Set(state.badges);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(state)).map((a) => a.id);
}
