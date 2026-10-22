// PLAY LAYER UI — lazy-loaded hub for the daily puzzle, duels, predictions,
// trivia, time machine, personas and the trophy case. All logic lives in
// game.js; this file is presentation + persistence glue. Per-device state only.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { FAMILIES, ERAS } from "./data.js";
import { TIER_META, tierFor } from "./scoring.js";
import { FONT_UI, FONT_MONO } from "./theme.js";
import { IconFootball, IconBasketball, IconStar, IconCheck, IconClose, IconDownload, IconLink, IconTrophy } from "./icons.jsx";
import { loadGame, saveGame } from "./store.js";
import {
  PROFILES, PROFILE_BY_NAME, MODEL_RANK, dayNumber, dayKey, puzzleNumber, msUntilMidnight,
  dailyTarget, MAX_GUESSES, evaluateGuess, CUE_KEYS, cellEmoji, hintsFor, shareText, searchProfiles, applyDailyResult,
  ELO_START, eloUpdate, pickDuel, eloRanking, pendingSlots, resolvePicks, eligibleFor,
  dailyTrivia, eraScores, movers, PRESETS, ACHIEVEMENTS, newlyEarned,
} from "./game.js";

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "duels", label: "Duels" },
  { key: "predict", label: "Call the Title" },
  { key: "trivia", label: "Trivia" },
  { key: "time", label: "Time Machine" },
  { key: "index", label: "My Index" },
  { key: "trophies", label: "Trophies" },
];
const SPORT_ICON = { cfb: IconFootball, cbb: IconBasketball };
const sportLabel = (s) => (s === "cfb" ? "Football" : "Basketball");
const fmtCountdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
export default function PlayHub({ C, ranked, sport, weights, selectedEras, recency, applyPreset, openByName }) {
  const [game, setGame] = useState(loadGame);
  const [tab, setTab] = useState("daily");
  const [toast, setToast] = useState(null);
  const update = (fn) => setGame((g) => fn(g));

  useEffect(() => { saveGame(game); }, [game]);

  // Award badges whenever state crosses a threshold (effect, so the updater stays pure).
  useEffect(() => {
    const earned = newlyEarned(game);
    if (!earned.length) return;
    setGame((g) => ({ ...g, badges: [...g.badges, ...earned] }));
    setToast(earned);
  }, [game]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Score any predictions the ledger has since decided (runs once per load).
  useEffect(() => {
    const { resolved } = resolvePicks(game.predict.picks);
    const fresh = resolved.filter((r) => !game.predict.scored.includes(r.key) && !r.void);
    if (!fresh.length) return;
    setGame((g) => ({
      ...g,
      predict: {
        ...g.predict,
        correct: g.predict.correct + fresh.filter((r) => r.correct).length,
        wrong: g.predict.wrong + fresh.filter((r) => !r.correct).length,
        scored: [...g.predict.scored, ...fresh.map((r) => r.key)],
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow };
  const common = { C, game, update, openByName, panel };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map((t) => (
          <button key={t.key} className={`btn small ${tab === t.key ? "on" : ""}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
        <span style={{ marginLeft: "auto", color: C.faint, fontSize: 10.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconTrophy size={12} /> {game.badges.length}/{ACHIEVEMENTS.length} badges · streak {game.daily.streak}
        </span>
      </div>
      {tab === "daily" && <DailyGame {...common} />}
      {tab === "duels" && <Duels {...common} />}
      {tab === "predict" && <Predict {...common} />}
      {tab === "trivia" && <Trivia {...common} />}
      {tab === "time" && <TimeMachine {...common} />}
      {tab === "index" && <MyIndex {...common} ranked={ranked} sport={sport} weights={weights} selectedEras={selectedEras} recency={recency} applyPreset={applyPreset} />}
      {tab === "trophies" && <Trophies {...common} />}
      {toast && (
        <div role="status" style={{ position: "fixed", right: 18, bottom: 18, zIndex: 60, background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: "12px 14px", boxShadow: C.shadow, maxWidth: 300 }}>
          <div style={{ color: C.accent, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><IconTrophy size={14} /> Badge unlocked</div>
          {toast.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id); return <div key={id} style={{ fontSize: 12, marginTop: 4 }}><b>{a.label}</b> <span style={{ color: C.dim }}>— {a.desc}</span></div>; })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Stat({ C, l, v, accent }) {
  return (
    <div style={{ minWidth: 64 }}>
      <div style={{ color: C.dim, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums", color: accent ? C.accent : C.text }}>{v}</div>
    </div>
  );
}
function Countdown({ C, label = "Next puzzle in" }) {
  const [ms, setMs] = useState(msUntilMidnight());
  useEffect(() => { const t = setInterval(() => setMs(msUntilMidnight()), 1000); return () => clearInterval(t); }, []);
  return <span style={{ color: C.dim, fontSize: 11.5 }}>{label} <b style={{ fontFamily: FONT_MONO, color: C.text }}>{fmtCountdown(ms)}</b></span>;
}
function NameLink({ C, name, openByName }) {
  return <button onClick={() => openByName(name)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.primary, fontWeight: 700, fontFamily: "inherit", fontSize: "inherit" }}>{name}</button>;
}
function TitleCount({ C, name }) {
  const p = PROFILE_BY_NAME[name];
  if (!p || !p.titleTotal) return <span style={{ color: C.faint }}>no titles</span>;
  return (
    <span style={{ display: "inline-flex", gap: 8, fontFamily: FONT_MONO, color: C.dim }}>
      {p.titles.cfb.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconFootball size={11} />{p.titles.cfb.length}</span>}
      {p.titles.cbb.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconBasketball size={11} />{p.titles.cbb.length}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DAILY BLIND RANK
function DailyGame({ C, game, update, openByName, panel }) {
  const target = useMemo(() => dailyTarget(), []);
  const num = puzzleNumber();
  const today = dayNumber();
  const saved = game.daily.game;
  const cur = saved && saved.day === today ? saved : { day: today, guesses: [], done: false, won: false };
  const evals = cur.guesses.map((n) => evaluateGuess(PROFILE_BY_NAME[n], target));
  const wrong = evals.filter((e) => !e.correct).length;
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const suggestions = searchProfiles(q).filter((p) => !cur.guesses.includes(p.name));

  const submit = (name) => {
    if (cur.done || !PROFILE_BY_NAME[name] || cur.guesses.includes(name)) return;
    const guesses = [...cur.guesses, name];
    const won = name === target.name;
    const done = won || guesses.length >= MAX_GUESSES;
    update((g) => ({
      ...g,
      daily: {
        ...(done ? applyDailyResult(g.daily, today, won, guesses.length, target.name) : g.daily),
        game: { day: today, guesses, done, won },
      },
    }));
    setQ("");
  };
  const share = async () => {
    try {
      const url = `${location.origin}${location.pathname}#v=play`;
      await navigator.clipboard.writeText(shareText(num, evals, cur.won, url));
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  const Bar = ({ label, val }) => (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: C.dim }}>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700 }}>{val == null ? "—" : Math.round(val)}</span>
      </div>
      <div style={{ height: 6, background: C.grid, borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${val ?? 0}%`, background: `linear-gradient(90deg,${C.primary},${C.accent})`, borderRadius: 3 }} />
      </div>
    </div>
  );
  const dirArrow = (dir) => (dir === "higher" ? "↑" : dir === "lower" ? "↓" : "");
  const cueLabel = { conf: "Conf", tier: "Tier", titles: "Titles", lean: "Lean", score: "Score" };
  const cueDir = (e, k) => (k === "tier" ? dirArrow(e.tierDir) : k === "titles" ? dirArrow(e.titlesDir) : k === "score" ? dirArrow(e.scoreDir) : "");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(280px,1.2fr)", gap: 12 }} className="play-grid">
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Blind Rank <span style={{ color: C.accent, fontFamily: FONT_MONO }}>#{num}</span></span>
          <span style={{ color: C.dim, fontSize: 10.5 }}>{MAX_GUESSES - cur.guesses.length} guesses left</span>
        </div>
        <div style={{ color: C.dim, fontSize: 11.5, lineHeight: 1.5, marginBottom: 12 }}>
          A mystery program's Power Index profile. Name it in {MAX_GUESSES} guesses — every miss unlocks a hint and cues on how close you were.
        </div>
        <div style={{ background: C.panel2, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2, color: cur.done ? C.text : C.faint }}>{cur.done ? target.name : "? ? ? ? ?"}</span>
            <span style={{ color: C.dim, fontSize: 10.5, fontFamily: FONT_MONO }}>combined {Math.round(target.combined)}</span>
          </div>
          {FAMILIES.map((f) => <Bar key={f.key} label={f.label} val={target.breakdown[f.key]} />)}
          <div style={{ marginTop: 8 }}>
            <div style={{ color: C.dim, fontSize: 10, marginBottom: 4 }}>Era trajectory (combined)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, alignItems: "end", height: 40 }}>
              {target.eraSeries.map((v, i) => (
                <div key={i} title={`${ERAS[i].label}: ${v == null ? "no data" : Math.round(v)}`} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ height: `${v ?? 4}%`, background: v == null ? C.grid : C.primary, borderRadius: 3, minHeight: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, color: C.faint, fontSize: 8.5, textAlign: "center", marginTop: 2 }}>
              {ERAS.map((e) => <span key={e.key}>{e.label}</span>)}
            </div>
          </div>
        </div>
        {hintsFor(target, wrong).length > 0 && !cur.done && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hintsFor(target, wrong).map((h) => <span key={h} style={{ background: `${C.accent}1f`, border: `1px solid ${C.accent}`, borderRadius: 999, padding: "3px 9px", fontSize: 10.5 }}>{h}</span>)}
          </div>
        )}
      </div>

      <div style={panel}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <Stat C={C} l="Streak" v={game.daily.streak} accent />
          <Stat C={C} l="Best" v={game.daily.maxStreak} />
          <Stat C={C} l="Solved" v={`${game.daily.wins}/${game.daily.played}`} />
          <Stat C={C} l="Cards" v={`${Object.keys(game.daily.solved).length}/${PROFILES.length}`} />
        </div>
        {!cur.done && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a program…" aria-label="Guess a program"
              onKeyDown={(e) => { if (e.key === "Enter" && suggestions[0]) submit(suggestions[0].name); }} />
            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {suggestions.map((p) => <button key={p.name} className="btn small" onClick={() => submit(p.name)}>{p.name}</button>)}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cur.guesses.map((name, i) => {
            const e = evals[i];
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, background: e.correct ? `${TIER_META.Power.color}22` : C.bg, border: `1px solid ${e.correct ? TIER_META.Power.color : C.border}`, borderRadius: 9, padding: "7px 10px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_MONO, color: C.faint, fontSize: 11, width: 14 }}>{i + 1}</span>
                <span style={{ fontWeight: 600, fontSize: 12.5, minWidth: 110, flex: 1 }}>{name}</span>
                {CUE_KEYS.map((k) => (
                  <span key={k} title={`${cueLabel[k]}: ${e[k]}${cueDir(e, k) ? ` (target ${k === "tier" ? e.tierDir : k === "titles" ? e.titlesDir : e.scoreDir})` : ""}`}
                    style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", fontSize: 9, color: C.dim, lineHeight: 1.2 }}>
                    <span style={{ fontSize: 14 }}>{cellEmoji(e[k])}<span style={{ fontSize: 11, color: C.text }}>{cueDir(e, k)}</span></span>
                    {cueLabel[k]}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {cur.done && (
          <div style={{ marginTop: 12, background: C.panel2, border: `1px solid ${cur.won ? TIER_META.Power.color : C.accent}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {cur.won ? `Solved in ${cur.guesses.length}!` : "Out of guesses."} It was <NameLink C={C} name={target.name} openByName={openByName} />.
            </div>
            <div style={{ color: C.dim, fontSize: 11.5, marginTop: 3, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span>{target.conf} · {target.tier} · leans {target.lean}</span> <TitleCount C={C} name={target.name} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={share}>{copied ? <IconCheck size={13} /> : <IconLink size={13} />} {copied ? "Copied" : "Share result"}</button>
              <Countdown C={C} />
            </div>
          </div>
        )}
        <div style={{ color: C.faint, fontSize: 9.5, marginTop: 10, lineHeight: 1.5 }}>
          Cues: 🟩 match · 🟨 close (adjacent tier / ±1 title / ±8 pts) · ⬛ off. Arrows point to the mystery program. Same puzzle for everyone each day.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DUELS
function Duels({ C, game, update, openByName, panel }) {
  const [pair, setPair] = useState(() => pickDuel());
  const [confirmReset, setConfirmReset] = useState(false);
  const elo = game.duels.elo;
  const vote = (winnerIdx) => {
    const [a, b] = pair;
    const ra = elo[a.name] ?? ELO_START, rb = elo[b.name] ?? ELO_START;
    const [na, nb] = eloUpdate(ra, rb, winnerIdx === 0);
    update((g) => ({ ...g, duels: { elo: { ...g.duels.elo, [a.name]: na, [b.name]: nb }, votes: g.duels.votes + 1 } }));
    setPair(pickDuel(Math.random, [a.name, b.name]));
  };
  const ranking = useMemo(() => eloRanking(elo).slice(0, 10), [elo]);
  const Card = ({ p, onPick }) => (
    <button onClick={onPick} aria-label={`Pick ${p.name}`}
      style={{ flex: 1, minWidth: 180, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left", color: C.text, fontFamily: FONT_UI, transition: "border-color .15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.primary)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>{p.name}</div>
      <div style={{ color: C.dim, fontSize: 11.5, marginTop: 2 }}>{p.conf}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, fontSize: 11 }}>
        <span style={{ color: TIER_META[p.peakTier]?.color, fontWeight: 700 }}>{p.peakTier}</span>
        <TitleCount C={C} name={p.name} />
      </div>
      <div style={{ color: C.faint, fontSize: 9.5, marginTop: 6 }}>leans {p.lean}</div>
    </button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Who's the better program?</span>
          <span style={{ color: C.dim, fontSize: 10.5, fontFamily: FONT_MONO }}>{game.duels.votes} votes cast</span>
        </div>
        <div style={{ color: C.dim, fontSize: 11.5, marginBottom: 12 }}>Gut call — scores are hidden on purpose. Each vote updates your personal Elo ranking of the field.</div>
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
          <Card p={pair[0]} onPick={() => vote(0)} />
          <div style={{ alignSelf: "center", color: C.faint, fontWeight: 700, fontSize: 12 }}>vs</div>
          <Card p={pair[1]} onPick={() => vote(1)} />
        </div>
        <div style={{ marginTop: 10 }}><button className="btn small" onClick={() => setPair(pickDuel(Math.random, [pair[0].name, pair[1].name]))}>Skip this pair</button></div>
      </div>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Your consensus vs. the model</span>
          {game.duels.votes >= 10 && (
            confirmReset
              ? <span style={{ display: "inline-flex", gap: 6 }}><button className="btn small" onClick={() => { update((g) => ({ ...g, duels: { elo: {}, votes: 0 } })); setConfirmReset(false); }}>Confirm reset</button><button className="btn small" onClick={() => setConfirmReset(false)}>Cancel</button></span>
              : <button className="btn small" onClick={() => setConfirmReset(true)}>Reset votes</button>
          )}
        </div>
        {game.duels.votes < 10 ? (
          <div style={{ color: C.dim, fontSize: 11.5 }}>Cast {10 - game.duels.votes} more vote{10 - game.duels.votes === 1 ? "" : "s"} to reveal your top 10 and how it diverges from the model.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
            <thead><tr style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", fontFamily: FONT_UI }}>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>#</th><th style={{ textAlign: "left", padding: "4px 6px" }}>Program</th><th style={{ padding: "4px 6px" }}>Elo</th><th style={{ padding: "4px 6px" }}>Model</th><th style={{ padding: "4px 6px" }}>Δ</th>
            </tr></thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.name} style={{ borderTop: `1px solid ${C.grid}` }}>
                  <td style={{ padding: "5px 6px", color: C.dim }}>{r.rank}</td>
                  <td style={{ padding: "5px 6px", fontFamily: FONT_UI, fontWeight: 600 }}><NameLink C={C} name={r.name} openByName={openByName} /></td>
                  <td style={{ padding: "5px 6px", textAlign: "center" }}>{Math.round(r.r)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "center", color: C.dim }}>#{r.modelRank}</td>
                  <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, color: r.delta > 0 ? TIER_META.Power.color : r.delta < 0 ? "#ef4444" : C.faint }}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ color: C.faint, fontSize: 9.5, marginTop: 8 }}>Δ = how many places higher (+) or lower (−) you rank a program than the model does. Unvoted programs sit at {ELO_START}.</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CALL THE TITLE
function Predict({ C, game, update, openByName, panel }) {
  const slots = useMemo(() => pendingSlots(), []);
  const { resolved } = useMemo(() => resolvePicks(game.predict.picks), [game.predict.picks]);
  const setPick = (key, name) => update((g) => ({ ...g, predict: { ...g.predict, picks: { ...g.predict.picks, [key]: name } } }));
  const clearPick = (key) => update((g) => { const picks = { ...g.predict.picks }; delete picks[key]; return { ...g, predict: { ...g.predict, picks } }; });
  const label = (s) => `${s.year} ${sportLabel(s.sport)}${s.sport === "cfb" ? ` (CFP title game, Jan ${s.year + 1})` : ` (NCAA tournament, Apr ${s.year})`}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Call the Title</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.dim }}>record <b style={{ color: TIER_META.Power.color }}>{game.predict.correct}</b>–<b style={{ color: "#ef4444" }}>{game.predict.wrong}</b></span>
        </div>
        <div style={{ color: C.dim, fontSize: 11.5, marginBottom: 12, lineHeight: 1.5 }}>
          Lock a champion for every undecided season in the ledger. When the real winner is added, your call resolves automatically and your record updates.
        </div>
        {slots.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>Every season in the ledger is decided — nothing to call right now.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
          {slots.map((s) => {
            const Icon = SPORT_ICON[s.sport];
            const pick = game.predict.picks[s.key];
            return (
              <div key={s.key} style={{ background: C.bg, border: `1px solid ${pick ? C.accent : C.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}><Icon size={14} /> {label(s)}</div>
                <select className="field" value={pick || ""} onChange={(e) => (e.target.value ? setPick(s.key, e.target.value) : clearPick(s.key))} aria-label={`Pick for ${label(s)}`}>
                  <option value="">— pick a champion —</option>
                  {eligibleFor(s.sport).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {pick && <div style={{ marginTop: 8, fontSize: 11.5, color: C.dim }}>Locked: <NameLink C={C} name={pick} openByName={openByName} /> <span style={{ color: C.faint }}>· model #{MODEL_RANK[pick]}</span></div>}
              </div>
            );
          })}
        </div>
      </div>
      {resolved.length > 0 && (
        <div style={panel}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Resolved calls</div>
          {resolved.map((r) => {
            const Icon = SPORT_ICON[r.sport];
            return (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: `1px solid ${C.grid}`, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_MONO, color: C.dim, width: 44 }}>{r.year}</span><Icon size={13} />
                <span>you called <b>{r.pick}</b></span>
                <span style={{ color: C.dim }}>→ {r.void ? "season not held" : <>champion <b>{r.actual}</b></>}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: r.void ? C.faint : r.correct ? TIER_META.Power.color : "#ef4444" }}>{r.void ? "void" : r.correct ? "✓ correct" : "✗"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TRIVIA
function Trivia({ C, game, update, panel }) {
  const qs = useMemo(() => dailyTrivia(), []);
  const key = dayKey();
  const day = game.trivia.byDay[key] || { answers: [], done: false };
  const i = day.answers.length;
  const [reveal, setReveal] = useState(null); // index just answered
  const answer = (idx) => {
    if (day.done || reveal != null) return;
    setReveal(idx);
    const answers = [...day.answers, idx];
    const done = answers.length >= qs.length;
    const perfect = done && answers.every((a, j) => a === qs[j].answer);
    update((g) => ({
      ...g,
      trivia: {
        byDay: { ...g.trivia.byDay, [key]: { answers, done } },
        perfectDays: g.trivia.perfectDays + (perfect && !g.trivia.byDay[key]?.done ? 1 : 0),
      },
    }));
  };
  const score = day.answers.filter((a, j) => a === qs[j].answer).length;
  // While feedback is showing, keep displaying the question just answered
  // (its answer is already counted in `i`), not the next one.
  const answered = reveal != null;
  const qi = answered ? i - 1 : Math.min(i, qs.length - 1);
  const q = qs[qi];
  return (
    <div style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Ledger Trivia · {key}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.dim }}>{score}/{qs.length} · perfect days {game.trivia.perfectDays}</span>
      </div>
      <div style={{ color: C.dim, fontSize: 11.5, marginBottom: 12 }}>Five questions generated from the verified 1976–present title ledger. New set every day.</div>
      {day.done && !answered ? (
        <div style={{ background: C.panel2, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{score === qs.length ? "Perfect! 🏆" : `${score} of ${qs.length}`}</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {qs.map((qq, j) => (
              <div key={j} style={{ fontSize: 11.5, display: "flex", gap: 8 }}>
                <span style={{ color: day.answers[j] === qq.answer ? TIER_META.Power.color : "#ef4444", fontWeight: 700 }}>{day.answers[j] === qq.answer ? "✓" : "✗"}</span>
                <span><span style={{ color: C.dim }}>{qq.q}</span> <b>{qq.options[qq.answer]}</b></span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Countdown C={C} label="Next set in" /></div>
        </div>
      ) : (
        <div>
          <div style={{ color: C.faint, fontSize: 10.5, fontFamily: FONT_MONO, marginBottom: 6 }}>Question {qi + 1} of {qs.length}</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, lineHeight: 1.4 }}>{q.q}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            {q.options.map((o, idx) => {
              const isAns = idx === q.answer, picked = reveal === idx;
              const bg = !answered ? C.bg : isAns ? `${TIER_META.Power.color}33` : picked ? "#ef444433" : C.bg;
              return <button key={o} className="btn" data-opt={idx} onClick={() => answer(idx)} disabled={answered} style={{ justifyContent: "flex-start", background: bg, borderColor: answered && (isAns || picked) ? (isAns ? TIER_META.Power.color : "#ef4444") : undefined, color: C.text, opacity: 1 }}>{o}</button>;
            })}
          </div>
          {answered && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: C.dim }}><b style={{ color: reveal === q.answer ? TIER_META.Power.color : "#ef4444" }}>{reveal === q.answer ? "Correct." : "Not quite."}</b> {q.explain}</span>
              <button className="btn on" onClick={() => setReveal(null)}>{i >= qs.length ? "See results" : "Next"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TIME MACHINE
function TimeMachine({ C, openByName, panel }) {
  const [sport, setSport] = useState("combined");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(ERAS.length - 1);
  const eras = useMemo(() => eraScores(sport), [sport]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= ERAS.length - 1) { setPlaying(false); return i; } return i + 1; }), 1400);
    return () => clearInterval(t);
  }, [playing]);
  const prev = idx > 0 ? Object.fromEntries(movers(eras[idx - 1], eras[idx]).map((m) => [m.name, m])) : {};
  const mv = useMemo(() => movers(eras[from], eras[to]).filter((m) => m.delta != null), [eras, from, to]);
  const risers = [...mv].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const fallers = [...mv].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const Delta = ({ m }) => {
    if (!m) return <span style={{ color: C.faint }}>—</span>;
    if (m.from == null) return <span style={{ color: C.accent, fontWeight: 700 }}>new</span>;
    if (m.delta === 0) return <span style={{ color: C.faint }}>=</span>;
    return <span style={{ color: m.delta > 0 ? TIER_META.Power.color : "#ef4444", fontWeight: 700 }}>{m.delta > 0 ? `↑${m.delta}` : `↓${-m.delta}`}</span>;
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1.3fr) minmax(240px,1fr)", gap: 12 }} className="play-grid">
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Time Machine · <span style={{ color: C.accent }}>{ERAS[idx].label}</span></span>
          <div className="segmented">
            {[["cfb", "CFB"], ["cbb", "CBB"], ["combined", "Both"]].map(([k, l]) => <button key={k} className={`btn seg small ${sport === k ? "on" : ""}`} onClick={() => { setSport(k); }}>{l}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          {ERAS.map((e, i) => <button key={e.key} className={`btn small ${idx === i ? "on" : ""}`} onClick={() => { setIdx(i); setPlaying(false); }}>{e.label}</button>)}
          <button className="btn small" onClick={() => { if (idx >= ERAS.length - 1) setIdx(0); setPlaying((p) => !p); }}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {eras[idx].slice(0, 15).map((r) => (
            <div key={r.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 52px", alignItems: "center", gap: 8, padding: "5px 8px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: FONT_MONO, color: C.dim, fontSize: 11 }}>{r.rank}</span>
              <span style={{ fontWeight: 600, fontSize: 12.5 }}><NameLink C={C} name={r.name} openByName={openByName} /> <span style={{ color: C.faint, fontSize: 10 }}>{r.conf}</span></span>
              <div style={{ height: 6, background: C.grid, borderRadius: 3 }}><div style={{ height: "100%", width: `${r.score}%`, background: C.primary, borderRadius: 3, transition: "width .5s" }} /></div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, textAlign: "right" }}>{Math.round(r.score)} <Delta m={idx > 0 ? prev[r.name] : null} /></span>
            </div>
          ))}
        </div>
        <div style={{ color: C.faint, fontSize: 9.5, marginTop: 8 }}>Each era scored on its own (default weights). Arrows show rank change from the previous era.</div>
      </div>
      <div style={panel}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Biggest movers</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10, fontSize: 11.5, color: C.dim, flexWrap: "wrap" }}>
          <select className="field" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(+e.target.value)} aria-label="From era">{ERAS.map((e, i) => <option key={e.key} value={i}>{e.label}</option>)}</select>
          →
          <select className="field" style={{ width: "auto" }} value={to} onChange={(e) => setTo(+e.target.value)} aria-label="To era">{ERAS.map((e, i) => <option key={e.key} value={i}>{e.label}</option>)}</select>
        </div>
        {[["Risers", risers, TIER_META.Power.color], ["Fallers", fallers, "#ef4444"]].map(([t, list, col]) => (
          <div key={t} style={{ marginBottom: 10 }}>
            <div style={{ color: col, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t}</div>
            {list.map((m) => (
              <div key={m.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderTop: `1px solid ${C.grid}` }}>
                <span><NameLink C={C} name={m.name} openByName={openByName} /> <span style={{ color: C.faint, fontSize: 10 }}>#{m.from}→#{m.to}</span></span>
                <span style={{ fontFamily: FONT_MONO, color: col, fontWeight: 700 }}>{m.delta > 0 ? `↑${m.delta}` : `↓${-m.delta}`} <span style={{ color: C.faint, fontWeight: 400 }}>({m.scoreDelta > 0 ? "+" : ""}{Math.round(m.scoreDelta)})</span></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MY INDEX (personas + share card)
function MyIndex({ C, ranked, sport, weights, selectedEras, recency, applyPreset, game, update, openByName, panel }) {
  const [name, setName] = useState("");
  const canvasRef = useRef(null);
  const same = (p) => JSON.stringify([p.weights, p.eras, p.recency]) === JSON.stringify([weights, selectedEras, recency]);
  const activePreset = PRESETS.find(same);
  const activeSaved = game.personas.find(same);
  const personaName = activeSaved?.name || activePreset?.label || "Custom";
  const top = ranked.slice(0, 10);
  const sportName = sport === "combined" ? "Combined" : sport === "cfb" ? "Football" : "Basketball";
  const save = () => {
    const n = name.trim();
    if (!n) return;
    update((g) => ({ ...g, personas: [...g.personas.filter((p) => p.name !== n), { name: n, weights, eras: selectedEras, recency }] }));
    setName("");
  };
  const download = () => {
    const cv = canvasRef.current; if (!cv) return;
    const W = 900, rowH = 44, H = 150 + rowH * top.length + 50;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.text; ctx.font = `700 30px ${FONT_UI}`; ctx.fillText("CFB × CBB Power Index", 40, 56);
    ctx.fillStyle = C.accent; ctx.font = `700 20px ${FONT_UI}`; ctx.fillText(`${personaName} · ${sportName} top 10`, 40, 90);
    ctx.fillStyle = C.dim; ctx.font = `12px ${FONT_UI}`;
    ctx.fillText(`weights ${FAMILIES.map((f) => `${f.short} ${weights[f.key]}`).join(" · ")} · eras ${ERAS.filter((e) => selectedEras[e.key]).map((e) => e.label).join(", ")}${recency ? ` · recency +${recency.toFixed(1)}` : ""}`, 40, 116);
    top.forEach((p, i) => {
      const y = 150 + i * rowH;
      ctx.fillStyle = i % 2 ? C.panel : C.panel2; ctx.fillRect(40, y, W - 80, rowH - 6);
      ctx.fillStyle = C.dim; ctx.font = `700 16px ${FONT_MONO}`; ctx.fillText(String(i + 1), 56, y + 26);
      ctx.fillStyle = C.text; ctx.font = `700 18px ${FONT_UI}`; ctx.fillText(p.name, 96, y + 27);
      ctx.fillStyle = C.dim; ctx.font = `12px ${FONT_UI}`; ctx.fillText(p.conf, 96 + ctx.measureText(p.name).width * 1.6 + 12, y + 26);
      const sc = Math.round(p.active);
      ctx.fillStyle = C.grid; ctx.fillRect(560, y + 14, 220, 10);
      ctx.fillStyle = TIER_META[tierFor(p.active)]?.color || C.primary; ctx.fillRect(560, y + 14, 220 * sc / 100, 10);
      ctx.fillStyle = C.text; ctx.font = `700 18px ${FONT_MONO}`; ctx.textAlign = "right"; ctx.fillText(String(sc), W - 56, y + 27); ctx.textAlign = "left";
    });
    ctx.fillStyle = C.faint; ctx.font = `12px ${FONT_UI}`; ctx.fillText("bh5msu-coder.github.io/CFBxCBB", 40, H - 20);
    const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = `power-index-${personaName.toLowerCase().replace(/\s+/g, "-")}.png`; a.click();
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)", gap: 12 }} className="play-grid">
      <div style={panel}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Build Your Index</div>
        <div style={{ color: C.dim, fontSize: 11.5, marginBottom: 12, lineHeight: 1.5 }}>Pick a persona to re-weight the whole model instantly, or save your own slider setup under a name. Your index is what the share card prints.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
          {PRESETS.map((p) => (
            <button key={p.key} className={`btn ${activePreset?.key === p.key ? "on" : ""}`} onClick={() => applyPreset(p)} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "9px 11px" }}>
              <span style={{ fontWeight: 700 }}>{p.label}</span>
              <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>{p.desc}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your current setup…" aria-label="Persona name" onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          <button className="btn" onClick={save} disabled={!name.trim()}>Save</button>
        </div>
        {game.personas.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {game.personas.map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: C.bg, border: `1px solid ${activeSaved?.name === p.name ? C.accent : C.border}`, borderRadius: 8, padding: "6px 10px" }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                <button className="btn small" onClick={() => applyPreset(p)}>Load</button>
                <button className="btn small icon" aria-label={`Delete ${p.name}`} onClick={() => update((g) => ({ ...g, personas: g.personas.filter((x) => x.name !== p.name) }))}><IconClose size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{personaName} · {sportName} top 10</span>
          <button className="btn" onClick={download} disabled={!top.length}><IconDownload size={13} /> Share card (PNG)</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {top.map((p, i) => (
            <div key={p.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr 44px", gap: 8, alignItems: "center", fontSize: 12.5, padding: "5px 8px", background: C.bg, borderRadius: 8 }}>
              <span style={{ fontFamily: FONT_MONO, color: C.dim }}>{i + 1}</span>
              <span style={{ fontWeight: 600 }}><NameLink C={C} name={p.name} openByName={openByName} /> <span style={{ color: C.faint, fontSize: 10 }}>{p.conf}</span></span>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 700, textAlign: "right", color: TIER_META[tierFor(p.active)]?.color }}>{Math.round(p.active)}</span>
            </div>
          ))}
          {!top.length && <div style={{ color: C.dim, fontSize: 12 }}>No programs ranked — check the era window and filters.</div>}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />
        <div style={{ color: C.faint, fontSize: 9.5, marginTop: 8 }}>The card prints exactly this list with your weights and eras — change the sliders in the rail to change the card.</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TROPHIES (badges + collection)
function Trophies({ C, game, openByName, panel }) {
  const earned = new Set(game.badges);
  const solved = game.daily.solved;
  const cards = useMemo(() => [...PROFILES].sort((a, b) => MODEL_RANK[a.name] - MODEL_RANK[b.name]), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={panel}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Badges · {earned.size}/{ACHIEVEMENTS.length}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const on = earned.has(a.id);
            return (
              <div key={a.id} style={{ background: on ? `${C.accent}1a` : C.bg, border: `1px solid ${on ? C.accent : C.border}`, borderRadius: 10, padding: "9px 11px", opacity: on ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12.5, color: on ? C.accent : C.dim }}><IconStar size={12} filled={on} /> {a.label}</div>
                <div style={{ color: C.dim, fontSize: 10.5, marginTop: 2 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Program cards · {Object.keys(solved).length}/{PROFILES.length}</span>
          <span style={{ color: C.dim, fontSize: 10.5 }}>unlock a card by solving its Blind Rank</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 6 }}>
          {cards.map((p) => {
            const on = solved[p.name] != null;
            const col = TIER_META[p.peakTier]?.color || C.faint;
            return (
              <button key={p.name} onClick={() => on && openByName(p.name)} disabled={!on} aria-label={on ? `${p.name} card` : "Locked card"}
                style={{ background: on ? C.bg : C.panel2, border: `1px solid ${on ? col : C.border}`, borderTop: `3px solid ${on ? col : C.border}`, borderRadius: 8, padding: "8px 9px", textAlign: "left", cursor: on ? "pointer" : "default", color: C.text, fontFamily: FONT_UI, opacity: on ? 1 : 0.5 }}>
                <div style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{on ? p.name : "? ? ?"}</div>
                <div style={{ color: C.dim, fontSize: 9.5, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                  <span>{on ? `#${MODEL_RANK[p.name]} · ${p.peakTier}` : `#${MODEL_RANK[p.name]}`}</span>
                  {on && <span style={{ fontFamily: FONT_MONO }}>{solved[p.name]}/{MAX_GUESSES}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
