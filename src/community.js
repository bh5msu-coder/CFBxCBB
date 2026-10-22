// ============================================================================
// COMMUNITY LAYER — anonymous, aggregate-only duel votes on Supabase.
// ============================================================================
// Talks to PostgREST with plain fetch (no SDK → zero bundle cost). The
// publishable key below is public by design; Row Level Security on the server
// is what protects the data: the anonymous role can read the ratings table and
// call ONE rate-limited, validating RPC — it cannot touch tables directly.
// Every call degrades silently so local play never depends on the network.
import { COMMUNITY } from "./community.config.js";

const VOTER_KEY = "cfbxcbb.voter.v1";
export const enabled = () => !!(COMMUNITY.url && COMMUNITY.key);

// A random per-browser id used only for server-side rate limiting. Not PII,
// never shown, and a cleared browser simply gets a new one.
export function voterId() {
  try {
    let v = localStorage.getItem(VOTER_KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(VOTER_KEY, v); }
    return v;
  } catch {
    return "anon";
  }
}

const headers = () => ({ apikey: COMMUNITY.key, Authorization: `Bearer ${COMMUNITY.key}`, "Content-Type": "application/json" });

// Records one duel result. Resolves to true on success, false on any failure
// (offline, rate-limited, unknown program) — callers treat it as best-effort.
export async function castVote(winner, loser) {
  if (!enabled() || !winner || !loser || winner === loser) return false;
  try {
    const r = await fetch(`${COMMUNITY.url}/rest/v1/rpc/cfbxcbb_cast_vote`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ p_winner: winner, p_loser: loser, p_voter: voterId() }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Community Elo ratings, highest first. null when unavailable.
export async function fetchRatings() {
  if (!enabled()) return null;
  try {
    const r = await fetch(`${COMMUNITY.url}/rest/v1/cfbxcbb_ratings?select=program,rating,votes,wins&order=rating.desc`, { headers: headers() });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Total duels in the community = each vote touches two rows, so Σvotes / 2.
export const totalDuels = (rows) => (rows ? Math.round(rows.reduce((a, r) => a + (r.votes || 0), 0) / 2) : 0);
