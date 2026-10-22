// Persisted Play-layer state. localStorage only (per device); every read and
// write is guarded so a private window or blocked storage degrades to an
// in-memory session instead of throwing. Shaped so a shared backend can mirror
// the same slices later without changing the UI.
export const GAME_KEY = "cfbxcbb.game.v1";

export const DEFAULT_GAME = {
  v: 1,
  badges: [],
  daily: { game: null, lastWonDay: null, streak: 0, maxStreak: 0, played: 0, wins: 0, solved: {} },
  duels: { elo: {}, votes: 0 },
  predict: { picks: {}, correct: 0, wrong: 0, scored: [] },
  trivia: { byDay: {}, perfectDays: 0 },
  personas: [],
};

function merge(base, over) {
  if (Array.isArray(base) || over == null || typeof over !== "object" || typeof base !== "object" || base == null) {
    return over === undefined ? base : over;
  }
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
}

export function loadGame() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(GAME_KEY) : null;
    if (!raw) return structuredClone(DEFAULT_GAME);
    return merge(structuredClone(DEFAULT_GAME), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_GAME);
  }
}

export function saveGame(state) {
  try { localStorage.setItem(GAME_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}
