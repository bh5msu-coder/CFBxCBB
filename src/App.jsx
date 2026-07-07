import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ERAS, FAMILIES, DEFAULT_WEIGHTS, ACTIVE, CONFS, CHAMPIONS, rawFor,
} from "./data.js";
import {
  computeSportScore, blendBreakdown, tierFor, TIER_ORDER, TIER_META,
} from "./scoring.js";
import { THEMES, FONT_UI, FONT_MONO } from "./theme.js";
import {
  IconLadder, IconQuadrant, IconGrid, IconTrophy, IconInfo, IconStar, IconFlag,
  IconClose, IconReset, IconSun, IconMoon, IconDownload, IconFootball, IconBasketball,
} from "./icons.jsx";

const PROGRAM_BY_NAME = Object.fromEntries(ACTIVE.map((p) => [p.name, p]));

const VIEWS = [
  { key: "ladder", label: "Ladder", Icon: IconLadder },
  { key: "scatter", label: "Quadrant", Icon: IconQuadrant },
  { key: "heatmap", label: "Heatmap", Icon: IconGrid },
  { key: "champions", label: "Champions", Icon: IconTrophy },
];

const initialTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
};

// ---------------------------------------------------------------------------
export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState("ladder");
  const [sport, setSport] = useState("combined");
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [selectedEras, setSelectedEras] = useState({ E1: true, E2: true, E3: true, E4: true });
  const [recency, setRecency] = useState(0);
  const [conf, setConf] = useState("All");
  const [search, setSearch] = useState("");
  const [spotlight, setSpotlight] = useState([]);
  const [detail, setDetail] = useState(null);
  const [onField, setOnField] = useState(false); // false = official (vacated removed)
  const [showMethod, setShowMethod] = useState(false);
  const [sortKey, setSortKey] = useState("combined");
  const [sortDir, setSortDir] = useState("desc");

  const C = THEMES[theme];
  const anyEra = Object.values(selectedEras).some(Boolean);
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);

  const scored = useMemo(() => {
    return ACTIVE.map((p) => {
      const cfb = computeSportScore(p, "cfb", weights, selectedEras, recency, onField);
      const cbb = computeSportScore(p, "cbb", weights, selectedEras, recency, onField);
      let combined = null, balanceBonus = 0;
      if (cfb && cbb) {
        const avg = (cfb.score + cbb.score) / 2;
        const minS = Math.min(cfb.score, cbb.score);
        balanceBonus = (minS / 100) * 6;
        combined = Math.min(100, avg + balanceBonus);
      } else if (cfb) combined = cfb.score * 0.92;
      else if (cbb) combined = cbb.score * 0.92;
      const active = sport === "combined" ? combined : sport === "cfb" ? cfb?.score : cbb?.score;
      const combBreak = cfb && cbb ? blendBreakdown(cfb.breakdown, cbb.breakdown) : (cfb?.breakdown || cbb?.breakdown);
      return {
        ...p, cfbScore: cfb?.score ?? null, cbbScore: cbb?.score ?? null,
        cfbBreak: cfb?.breakdown, cbbBreak: cbb?.breakdown, combBreak,
        combined, balanceBonus, active,
      };
    });
  }, [weights, selectedEras, recency, sport, onField]);

  const filtered = useMemo(() => {
    let r = scored.filter((p) => p.active != null);
    if (conf !== "All") r = r.filter((p) => p.conf === conf);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q));
    }
    return r;
  }, [scored, conf, search]);

  const ranked = useMemo(() => [...filtered].sort((a, b) => b.active - a.active), [filtered]);

  const kpis = useMemo(() => {
    const top = ranked[0];
    const blue = ranked.filter((p) => tierFor(p.active) === "Blue Blood").length;
    return { count: ranked.length, top, blue };
  }, [ranked]);

  const resetWeights = () => setWeights({ ...DEFAULT_WEIGHTS });
  const toggleSpotlight = (name) =>
    setSpotlight((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  const openByName = (name) => { if (PROGRAM_BY_NAME[name]) setDetail(scored.find((p) => p.name === name)); };

  const exportCsv = () => {
    const head = ["rank", "program", "conference", sport, "football", "basketball", ...FAMILIES.map((f) => f.short)];
    const brkKey = sport === "cbb" ? "cbbBreak" : sport === "combined" ? "combBreak" : "cfbBreak";
    const rows = ranked.map((p, i) => {
      const b = p[brkKey] || {};
      const r = (v) => (v == null ? "" : Math.round(v));
      return [i + 1, `"${p.name}"`, `"${p.conf}"`, r(p.active), r(p.cfbScore), r(p.cbbScore), ...FAMILIES.map((f) => r(b[f.key]))].join(",");
    });
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `power-index-${sport}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const shell = { background: C.bg, color: C.text, fontFamily: FONT_UI, minHeight: "100vh", padding: "18px", fontSize: 13.5 };

  return (
    <div style={shell}>
      <GlobalStyle C={C} />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 20, fontWeight: 700, letterSpacing: -0.2 }}>
            <span style={{ color: C.accent, display: "inline-flex" }}><IconTrophy size={22} /></span>
            CFB <span style={{ color: C.faint, fontWeight: 500 }}>×</span> CBB
            <span style={{ color: C.primary }}>Power Index</span>
          </div>
          <div style={{ color: C.dim, fontSize: 11.5, marginTop: 4 }}>
            50-Season Program Rankings · 1976–2025 model · live title ledger · {ACTIVE.length} programs
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {VIEWS.map(({ key, label, Icon }) => (
            <button key={key} className={`btn ${view === key ? "on" : ""}`} aria-pressed={view === key} onClick={() => setView(key)}>
              <Icon size={14} /> {label}
            </button>
          ))}
          <button className="btn" onClick={() => setShowMethod((s) => !s)} aria-expanded={showMethod}><IconInfo size={14} /> Methods</button>
          <button className="btn icon" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
        </div>
      </header>

      {showMethod && <MethodPanel C={C} close={() => setShowMethod(false)} />}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <aside className="rail" style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <Section C={C} title="Sport">
            <div className="segmented">
              {[["cfb", "Football", IconFootball], ["cbb", "Basketball", IconBasketball], ["combined", "Combined", null]].map(([k, l, Ico]) => (
                <button key={k} className={`btn seg ${sport === k ? "on" : ""}`} aria-pressed={sport === k} onClick={() => setSport(k)}>
                  {Ico ? <Ico size={13} /> : null} {l}
                </button>
              ))}
            </div>
          </Section>

          <Section C={C} title="Era Window">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {ERAS.map((e) => (
                <button key={e.key} className={`btn ${selectedEras[e.key] ? "on" : ""}`} aria-pressed={selectedEras[e.key]}
                  onClick={() => setSelectedEras((s) => ({ ...s, [e.key]: !s[e.key] }))}>{e.label}</button>
              ))}
            </div>
            {!anyEra && <div style={{ color: C.accent, fontSize: 10.5, marginTop: 8 }}>Select at least one era to see rankings.</div>}
            <div style={{ marginTop: 12 }}>
              <Label C={C} l="Recency weighting" v={recency === 0 ? "equal" : `+${recency.toFixed(1)}`} />
              <input type="range" min={0} max={1} step={0.1} value={recency} aria-label="Recency weighting"
                style={{ width: "100%" }} onChange={(e) => setRecency(+e.target.value)} />
              <div style={{ display: "flex", justifyContent: "space-between", color: C.faint, fontSize: 9.5, marginTop: 2 }}><span>equal</span><span>recent ↑</span></div>
            </div>
          </Section>

          <Section C={C} title={`Metric Weights · Σ${totalW}`}>
            {FAMILIES.map((f) => (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <Label C={C} l={f.label} v={weights[f.key]} />
                <input type="range" min={0} max={40} step={1} value={weights[f.key]} aria-label={`${f.label} weight`}
                  style={{ width: "100%" }} onChange={(e) => setWeights((w) => ({ ...w, [f.key]: +e.target.value }))} />
              </div>
            ))}
            {totalW === 0 && <div style={{ color: C.accent, fontSize: 10.5, marginBottom: 6 }}>All weights are zero — raise one to rank programs.</div>}
            <button className="btn wide" onClick={resetWeights}><IconReset size={13} /> Reset defaults</button>
          </Section>

          <Section C={C} title="Filters">
            <Label C={C} l="Conference" />
            <select value={conf} onChange={(e) => setConf(e.target.value)} className="field" aria-label="Conference filter" style={{ marginBottom: 10 }}>
              {CONFS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Label C={C} l="Search" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="filter by name…" className="field" aria-label="Search programs" />
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: C.dim, fontSize: 11.5 }}>Vacated results</span>
              <button className={`btn small ${onField ? "on" : ""}`} aria-pressed={onField} onClick={() => setOnField((s) => !s)}>
                {onField ? "On-field" : "Official"}
              </button>
            </div>
            <div style={{ color: C.faint, fontSize: 9.5, marginTop: 4, lineHeight: 1.45 }}>
              {onField ? "Vacated titles/wins counted as played — flagged programs score higher." : "NCAA official — vacated titles/wins removed for flagged programs."}
            </div>
            <button className="btn wide" style={{ marginTop: 12 }} onClick={exportCsv} disabled={!ranked.length}><IconDownload size={13} /> Export CSV</button>
          </Section>
        </aside>

        <main style={{ flex: 1, minWidth: 300 }}>
          {view !== "champions" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
              <StatTile C={C} label="Programs ranked" value={kpis.count} />
              <StatTile C={C} label={`Top ${sport === "combined" ? "combined" : sport === "cfb" ? "football" : "basketball"}`}
                value={kpis.top ? kpis.top.name : "—"} sub={kpis.top ? Math.round(kpis.top.active) : null} accent />
              <StatTile C={C} label="Blue Bloods" value={kpis.blue} />
            </div>
          )}

          {!anyEra ? (
            <EmptyState C={C} title="No era selected" msg="Pick one or more era windows in the left rail to build the rankings." />
          ) : view === "champions" ? (
            <ChampionsView C={C} openByName={openByName} />
          ) : ranked.length === 0 && view !== "scatter" ? (
            <EmptyState C={C} title="No programs match" msg="Loosen the conference filter or clear the search to see results." />
          ) : view === "ladder" ? (
            <LadderView C={C} ranked={ranked} sport={sport} spotlight={spotlight} toggleSpotlight={toggleSpotlight} setDetail={setDetail} />
          ) : view === "scatter" ? (
            <ScatterView C={C} scored={filtered} setDetail={setDetail} spotlight={spotlight} />
          ) : (
            <HeatmapView C={C} ranked={ranked} sport={sport} sortKey={sortKey} setSortKey={setSortKey} sortDir={sortDir} setSortDir={setSortDir} setDetail={setDetail} />
          )}
        </main>
      </div>

      {detail && <DetailModal C={C} prog={detail} close={() => setDetail(null)} weights={weights} onField={onField} />}

      <footer style={{ marginTop: 22, paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.dim, fontSize: 10.5, lineHeight: 1.55 }}>
        Championships, Final Fours &amp; the season title ledger are high-confidence. Recruiting / poll-weeks / advanced / pro / era-split win% are{" "}
        <span style={{ color: C.accent }}>calibrated analyst estimates on a relative 0–100 scale</span> — not exact sourced season figures.
        Open Methods for full notes. Vacated programs flagged with a pennant.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
function GlobalStyle({ C }) {
  return (
    <style>{`
      *{box-sizing:border-box;}
      body{margin:0;}
      ::selection{background:${C.primary}44;}
      input[type=range]{-webkit-appearance:none;appearance:none;height:5px;background:${C.grid};border-radius:3px;outline:none;}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${C.primary};cursor:pointer;border:2px solid ${C.panel};}
      input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:${C.primary};cursor:pointer;border:2px solid ${C.panel};}
      .field{width:100%;background:${C.panel2};color:${C.text};border:1px solid ${C.border};border-radius:7px;padding:8px 9px;font-family:${FONT_UI};font-size:12px;}
      .field::placeholder{color:${C.faint};}
      .btn{display:inline-flex;align-items:center;gap:6px;background:${C.panel2};border:1px solid ${C.border};color:${C.dim};padding:7px 11px;border-radius:8px;cursor:pointer;font-family:${FONT_UI};font-size:12px;font-weight:500;transition:background .15s,border-color .15s,color .15s;}
      .btn:hover{border-color:${C.primary};color:${C.text};}
      .btn.on{background:${C.primary};color:${C.accentText};border-color:${C.primary};font-weight:600;}
      .btn.wide{width:100%;justify-content:center;}
      .btn.small{padding:4px 9px;font-size:11px;}
      .btn.icon{padding:7px;}
      .btn.seg{flex:1;justify-content:center;padding:7px 4px;font-size:11.5px;}
      .btn:disabled{opacity:.45;cursor:not-allowed;}
      .segmented{display:flex;gap:5px;}
      .row{transition:background .15s,border-color .15s,transform .15s;}
      .row:hover{background:${C.panel2};}
      button:focus-visible,[tabindex]:focus-visible,select:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid ${C.accent};outline-offset:2px;}
      @media (max-width:880px){.rail{width:100%!important;}}
      @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important;}}
    `}</style>
  );
}

function Section({ C, title, children }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 13, boxShadow: C.shadow }}>
      <h2 style={{ color: C.dim, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 10px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Label({ C, l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, marginBottom: 4 }}>
      <span>{l}</span>{v !== undefined && v !== "" && <span style={{ color: C.text, fontWeight: 600, fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{v}</span>}
    </div>
  );
}

function StatTile({ C, label, value, sub, accent }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: C.shadow }}>
      <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: typeof value === "string" && value.length > 8 ? 16 : 24, fontWeight: 700, color: accent ? C.accent : C.text, fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {sub != null && <span style={{ fontSize: 13, color: C.dim, fontFamily: FONT_MONO }}>{sub}</span>}
      </div>
    </div>
  );
}

function EmptyState({ C, title, msg }) {
  return (
    <div style={{ background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div style={{ color: C.dim, fontSize: 12.5, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>{msg}</div>
    </div>
  );
}

// ----- LADDER VIEW -----
function LadderView({ C, ranked, sport, spotlight, toggleSpotlight, setDetail }) {
  const grouped = {};
  TIER_ORDER.forEach((t) => (grouped[t] = []));
  ranked.forEach((p) => { const t = tierFor(p.active); if (t) grouped[t].push(p); });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {TIER_ORDER.map((t) => {
        const meta = TIER_META[t];
        const list = grouped[t];
        if (!list.length) return null;
        return (
          <div key={t} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 12, padding: 13, boxShadow: C.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: meta.color, fontWeight: 700, fontSize: 13.5, letterSpacing: 0.4, textTransform: "uppercase" }}>{t}</span>
              <span style={{ color: C.dim, fontSize: 11.5 }}>{list.length} program{list.length > 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {list.map((p) => {
                const spot = spotlight.includes(p.name);
                return (
                  <div key={p.name} className="row" role="button" tabIndex={0}
                    aria-label={`${p.name}, ${t}, score ${Math.round(p.active)}. Open details.`}
                    onClick={() => setDetail(p)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(p); } }}
                    style={{ cursor: "pointer", background: spot ? C.panel2 : C.bg, border: `1px solid ${spot ? C.accent : C.border}`, borderRadius: 10, padding: "9px 11px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: meta.color, fontWeight: 700, fontSize: 17, width: 34, textAlign: "right", fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.active)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        {p.vacated && <span title="Has NCAA-vacated results" style={{ color: C.accent, display: "inline-flex" }}><IconFlag size={12} /></span>}
                      </div>
                      <div style={{ color: C.dim, fontSize: 10, marginTop: 1 }}>
                        {p.conf}{sport === "combined" && p.cfbScore != null && p.cbbScore != null ? ` · F${Math.round(p.cfbScore)}/B${Math.round(p.cbbScore)}` : ""}
                      </div>
                    </div>
                    <button className={`btn small ${spot ? "on" : ""}`} aria-label={`${spot ? "Remove" : "Add"} ${p.name} spotlight`} aria-pressed={spot}
                      style={{ padding: 5 }} onClick={(e) => { e.stopPropagation(); toggleSpotlight(p.name); }}>
                      <IconStar size={13} filled={spot} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----- SCATTER VIEW -----
function ScatterView({ C, scored, setDetail, spotlight }) {
  const data = scored.filter((p) => p.cfbScore != null && p.cbbScore != null).map((p) => ({
    x: p.cfbScore, y: p.cbbScore, z: p.combined, name: p.name, conf: p.conf, vacated: p.vacated, raw: p,
  }));
  const Dot = (props) => {
    const { cx, cy, payload } = props;
    const spot = spotlight.includes(payload.name);
    const r = 4 + (payload.z / 100) * 9;
    return (
      <g style={{ cursor: "pointer" }} tabIndex={0} role="button" aria-label={`${payload.name}. Football ${Math.round(payload.x)}, basketball ${Math.round(payload.y)}. Open details.`}
        onClick={() => setDetail(payload.raw)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(payload.raw); } }}>
        <circle cx={cx} cy={cy} r={r} fill={spot ? C.accent : C.primary} fillOpacity={spot ? 0.9 : 0.45} stroke={spot ? C.accent : C.primary} strokeWidth={1.4} />
        {(payload.z > 72 || spot) && <text x={cx} y={cy - r - 4} textAnchor="middle" fill={C.text} fontSize={9.5} fontFamily={FONT_MONO}>{payload.name}</text>}
      </g>
    );
  };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Two-Sport Quadrant</span>
        <span style={{ color: C.dim, fontSize: 10.5 }}>bubble = combined score · click a point to expand</span>
      </div>
      {data.length === 0 ? (
        <EmptyState C={C} title="No two-sport programs" msg="This view needs programs with both football and basketball data. Clear filters to see them." />
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 6, right: 10, color: C.accent, fontSize: 10, fontWeight: 600, zIndex: 1, opacity: 0.85 }}>TWO-SPORT BLUE BLOODS ↗</div>
          <div style={{ position: "absolute", top: 6, left: 54, color: C.dim, fontSize: 10, zIndex: 1, opacity: 0.75 }}>↖ HOOPS SCHOOLS</div>
          <div style={{ position: "absolute", bottom: 34, right: 10, color: C.dim, fontSize: 10, zIndex: 1, opacity: 0.75 }}>FOOTBALL SCHOOLS ↘</div>
          <ResponsiveContainer width="100%" height={470}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid stroke={C.grid} />
              <XAxis type="number" dataKey="x" domain={[15, 100]} name="CFB" tick={{ fill: C.dim, fontSize: 10 }} stroke={C.border}
                label={{ value: "FOOTBALL SCORE →", position: "bottom", fill: C.dim, fontSize: 10 }} />
              <YAxis type="number" dataKey="y" domain={[15, 100]} name="CBB" tick={{ fill: C.dim, fontSize: 10 }} stroke={C.border}
                label={{ value: "BASKETBALL SCORE →", angle: -90, position: "insideLeft", fill: C.dim, fontSize: 10 }} />
              <ReferenceLine x={60} stroke={C.border} strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke={C.border} strokeDasharray="3 3" />
              <Tooltip cursor={{ strokeDasharray: "3 3", stroke: C.primary }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const rf = rawFor(d.name, "cfb"); const rb = rawFor(d.name, "cbb");
                  const note = (rf && (rf.champ || rf.winpct)) || (rb && (rb.champ || rb.winpct)) || null;
                  return (
                    <div style={{ background: C.panel2, border: `1px solid ${C.primary}`, borderRadius: 8, padding: 10, fontSize: 11.5, fontFamily: FONT_UI, maxWidth: 230, boxShadow: C.shadow }}>
                      <div style={{ fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 5 }}>{d.name} {d.vacated && <span style={{ color: C.accent, display: "inline-flex" }}><IconFlag size={11} /></span>}</div>
                      <div style={{ color: C.dim }}>{d.conf}</div>
                      <div style={{ color: C.primary, fontFamily: FONT_MONO, marginTop: 3 }}>CFB {Math.round(d.x)} · CBB {Math.round(d.y)}</div>
                      <div style={{ color: C.accent, fontFamily: FONT_MONO }}>Combined {Math.round(d.z)}</div>
                      {note && <div style={{ color: C.text, fontStyle: "italic", marginTop: 5, fontSize: 10.5, lineHeight: 1.4 }}>{note}</div>}
                    </div>
                  );
                }} />
              <Scatter data={data} shape={<Dot />} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ----- HEATMAP VIEW -----
function HeatmapView({ C, ranked, sport, sortKey, setSortKey, sortDir, setSortDir, setDetail }) {
  const useBreak = sport === "cbb" ? "cbbBreak" : sport === "combined" ? "combBreak" : "cfbBreak";
  const rows = useMemo(() => {
    const r = ranked.map((p) => ({ ...p, _b: p[useBreak] || {} }));
    const dir = sortDir === "desc" ? -1 : 1;
    return r.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const av = sortKey === "combined" ? a.active : (a._b[sortKey] ?? -1);
      const bv = sortKey === "combined" ? b.active : (b._b[sortKey] ?? -1);
      return (av - bv) * dir;
    });
  }, [ranked, sortKey, sortDir, useBreak]);

  const sortBy = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };
  const cellColor = (v) => {
    if (v == null) return "transparent";
    const t = v / 100;
    // primary-blue → amber ramp; opacity scales with value
    const r = Math.round(40 + t * 205), g = Math.round(90 + t * 120), b = Math.round(150 - t * 120);
    return `rgba(${r},${g},${b},${0.16 + t * 0.6})`;
  };
  // dark text on the bright/amber high end, light text on the deep-blue low end
  const cellTextColor = (v) => (v != null && v / 100 > 0.55 ? C.cellTextDark : C.cellText);
  const ariaSort = (k) => (sortKey === k ? (sortDir === "desc" ? "descending" : "ascending") : "none");
  const Th = ({ k, label, left }) => (
    <th aria-sort={ariaSort(k)} style={{ padding: 0, width: k === "name" ? undefined : 46 }}>
      <button onClick={() => sortBy(k)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: sortKey === k ? C.primary : C.dim, fontSize: 10.5, fontWeight: 600, textAlign: left ? "left" : "center", padding: "9px 6px", fontFamily: FONT_UI, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{sortKey === k ? (sortDir === "desc" ? " ▾" : " ▴") : ""}
      </button>
    </th>
  );
  const sportTag = sport === "combined" ? "blend" : sport === "cbb" ? "CBB" : "CFB";
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, overflowX: "auto", boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 8px 0", color: C.faint, fontSize: 10 }}>
        family cells show <span style={{ color: C.dim, fontWeight: 600, margin: "0 4px" }}>{sportTag}</span> values
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontFamily: FONT_MONO }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={{ padding: "9px 6px", color: C.dim, fontSize: 10.5, textAlign: "center", width: 30 }}>#</th>
            <Th k="name" label="Program" left />
            <Th k="combined" label={sport === "combined" ? "Comb" : "Score"} />
            {FAMILIES.map((f) => <Th key={f.key} k={f.key} label={f.short} />)}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.name} className="row" role="button" tabIndex={0}
              aria-label={`${p.name}, score ${Math.round(p.active)}. Open details.`}
              onClick={() => setDetail(p)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(p); } }}
              style={{ cursor: "pointer", borderBottom: `1px solid ${C.grid}` }}>
              <td style={{ padding: 6, color: C.dim, fontSize: 11, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
              <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", fontFamily: FONT_UI }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {p.name} {p.vacated && <span style={{ color: C.accent, display: "inline-flex" }}><IconFlag size={11} /></span>}
                </span>
                <div style={{ color: C.dim, fontSize: 9.5, fontWeight: 400 }}>{p.conf}</div>
              </td>
              <td style={{ padding: 4, textAlign: "center", fontWeight: 700, color: TIER_META[tierFor(p.active)]?.color, fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.active)}</td>
              {FAMILIES.map((f) => {
                const v = p._b[f.key];
                return (
                  <td key={f.key} style={{ padding: 3, textAlign: "center" }}>
                    <div style={{ background: cellColor(v), borderRadius: 5, padding: "5px 2px", color: v == null ? C.faint : cellTextColor(v), fontSize: 11.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {v == null ? "—" : Math.round(v)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----- CHAMPIONS VIEW -----
function ChampionsView({ C, openByName }) {
  const Name = ({ name }) => {
    if (name == null) return <span style={{ color: C.faint, fontStyle: "italic" }}>awaiting result</span>;
    const known = PROGRAM_BY_NAME[name];
    if (!known) return <span>{name}</span>;
    return (
      <button onClick={() => openByName(name)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.primary, fontWeight: 600, fontFamily: "inherit", fontSize: "inherit", textAlign: "left" }}>
        {name}
      </button>
    );
  };
  const Cell = ({ Icon, name }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
      <span style={{ color: name == null ? C.faint : C.dim, display: "inline-flex", flexShrink: 0 }}><Icon size={16} /></span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Name name={name} /></span>
    </div>
  );
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>National Champions — Season Ledger</span>
        <span style={{ color: C.dim, fontSize: 10.5 }}>appendable · add each title as it becomes official</span>
      </div>
      <div style={{ color: C.dim, fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 640 }}>
        The forward-looking record. Each row is a season; football is the College Football Playoff / BCS champion,
        basketball the NCAA tournament champion. Rows awaiting a decided title are highlighted — that is where the next
        season plugs in.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 1fr", gap: 0, fontSize: 12.5 }}>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 0 8px" }}>Season</div>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><IconFootball size={13} /> Football</div>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><IconBasketball size={13} /> Basketball</div>
        {CHAMPIONS.map((s) => {
          const pending = s.cfb == null || s.cbb == null;
          return (
            <React.Fragment key={s.year}>
              <div style={{ gridColumn: "1 / -1", height: 1, background: C.grid }} />
              <div style={{ padding: "10px 0", fontWeight: 700, fontFamily: FONT_MONO, color: pending ? C.accent : C.text, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 6 }}>
                {s.year}
              </div>
              <div style={{ padding: "10px 8px 10px 0", background: s.cfb == null ? `${C.accent}14` : "transparent" }}><Cell Icon={IconFootball} name={s.cfb} /></div>
              <div style={{ padding: "10px 8px", background: s.cbb == null ? `${C.accent}14` : "transparent" }}><Cell Icon={IconBasketball} name={s.cbb} /></div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ marginTop: 14, color: C.faint, fontSize: 10, lineHeight: 1.5 }}>
        Note: the 2019–20 NCAA basketball tournament was cancelled (COVID-19); Baylor is listed for the 2020–21 season.
        Champion names link to the program's Power Index profile where one exists.
      </div>
    </div>
  );
}

// ----- DETAIL MODAL -----
function DetailModal({ C, prog, close, weights, onField }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const Bar = ({ label, val, w, raw }) => (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
        <span style={{ color: C.dim }}>{label} <span style={{ color: C.accent, fontSize: 9.5, fontFamily: FONT_MONO }}>·w{w}</span></span>
        <span style={{ fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{val == null ? "—" : Math.round(val)}</span>
      </div>
      <div style={{ height: 7, background: C.grid, borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${val ?? 0}%`, background: `linear-gradient(90deg,${C.primary},${C.accent})`, borderRadius: 4, transition: "width .3s" }} />
      </div>
      {raw && <div style={{ color: C.primary, fontSize: 9.5, marginTop: 2, fontStyle: "italic" }}>↳ {raw}</div>}
    </div>
  );
  const SportBlock = ({ title, Icon, score, brk, sportKey }) => {
    const raw = rawFor(prog.name, sportKey);
    if (score == null) return (
      <div style={{ flex: 1, minWidth: 210 }}>
        <div style={{ color: C.dim, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon size={15} /> {title}</div>
        <div style={{ color: C.dim, fontSize: 11.5, fontStyle: "italic" }}>No meaningful top-division presence in window.</div>
      </div>
    );
    return (
      <div style={{ flex: 1, minWidth: 210 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: C.text, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon size={15} /> {title}</span>
          <span style={{ fontWeight: 700, color: TIER_META[tierFor(score)]?.color, fontFamily: FONT_MONO }}>{Math.round(score)} · {tierFor(score)}</span>
        </div>
        {FAMILIES.map((f) => <Bar key={f.key} label={f.label} val={brk?.[f.key]} w={weights[f.key]} raw={raw?.[f.key]} />)}
      </div>
    );
  };
  return (
    <div onClick={close} role="dialog" aria-modal="true" aria-label={`${prog.name} details`}
      style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {prog.name}
              {prog.vacated && <span title="NCAA-vacated results" style={{ color: C.accent, fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 3, border: `1px solid ${C.accent}`, borderRadius: 6, padding: "2px 6px" }}><IconFlag size={12} /> vacated</span>}
            </div>
            <div style={{ color: C.dim, fontSize: 11.5, marginTop: 2 }}>{prog.conf}</div>
          </div>
          <button ref={closeRef} className="btn" onClick={close}><IconClose size={14} /> Close</button>
        </div>
        <div style={{ display: "flex", gap: 16, margin: "16px 0", flexWrap: "wrap" }}>
          <Stat C={C} l="Combined" v={prog.combined} big />
          <Stat C={C} l="Football" v={prog.cfbScore} />
          <Stat C={C} l="Basketball" v={prog.cbbScore} />
          {prog.balanceBonus > 0.3 && <Stat C={C} l="2-Sport Bonus" v={`+${prog.balanceBonus.toFixed(1)}`} raw />}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <SportBlock title="Football" Icon={IconFootball} score={prog.cfbScore} brk={prog.cfbBreak} sportKey="cfb" />
          <SportBlock title="Basketball" Icon={IconBasketball} score={prog.cbbScore} brk={prog.cbbBreak} sportKey="cbb" />
        </div>
        {prog.vacated && (
          <div style={{ marginTop: 16, background: C.panel2, border: `1px solid ${C.accent}`, borderRadius: 8, padding: 11, fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>
            This program has NCAA-vacated results. Scores reflect the <b style={{ color: C.text }}>{onField ? "on-field (vacated counted)" : "official (vacated removed)"}</b> setting — the Championships / Win% / Poll families are {onField ? "shown at full value" : "reduced"} accordingly. Toggle in the Filters rail.
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 9.5, color: C.faint, lineHeight: 1.5 }}>
          Scores are relative composites on the selected era window &amp; weights. Soft families (recruiting/poll/advanced/pro) are calibrated estimates, not exact records.
        </div>
      </div>
    </div>
  );
}

function Stat({ C, l, v, big, raw }) {
  return (
    <div>
      <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
      <div style={{ fontSize: big ? 32 : 23, fontWeight: 700, color: big ? C.primary : C.text, fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{v == null ? "—" : raw ? v : Math.round(v)}</div>
    </div>
  );
}

// ----- METHOD PANEL -----
function MethodPanel({ C, close }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 18, marginBottom: 16, fontSize: 12, lineHeight: 1.6, boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>Methodology &amp; Sources</span>
        <button className="btn icon" aria-label="Close methods" onClick={close}><IconClose size={15} /></button>
      </div>
      <p style={{ marginTop: 0 }}><b style={{ color: C.text }}>Structure.</b> Each program carries era-bucketed scores (1976–89 / 1990–99 / 2000–09 / 2010–25) for six metric families, per sport, on a relative 0–100 scale (100 = best-in-class over the window). Selecting eras and recency weighting re-aggregates live; metric-weight sliders recompute composites live.</p>
      <p><b style={{ color: C.text }}>Composite.</b> Weighted mean of the six families (default Champ 30 / Win% 20 / Pro 15 / Recruit 10 / Poll 15 / Adv 10). Combined = mean of CFB &amp; CBB plus a two-sport balance bonus (up to +6) rewarding schools strong in <i>both</i>. Single-sport programs take a 0.92 factor so they don't dominate the combined board on one leg.</p>
      <p><b style={{ color: C.text }}>Vacated toggle.</b> In <b>Official</b> mode, flagged programs have their Championships (×0.86), Win% (×0.93) and Poll (×0.95) families reduced to reflect vacated titles/wins; <b>On-field</b> restores them. The toggle now visibly changes those programs' scores.</p>
      <p><b style={{ color: C.text }}>Champions ledger.</b> The Champions tab is a season-by-season national-title record and the app's forward-looking surface — as each championship is decided, one row is appended and everything else stays put. Undecided seasons render as "awaiting result".</p>
      <p><b style={{ color: C.text }}>Tiers.</b> Blue Blood ≥82 · Elite ≥70 · Power ≥58 · Solid ≥45 · Rising &lt;45, from the active composite.</p>
      <p style={{ color: C.accent, marginBottom: 4 }}><b>Data confidence — read this.</b></p>
      <ul style={{ margin: "4px 0", paddingLeft: 18, color: C.dim }}>
        <li><b style={{ color: C.text }}>High confidence:</b> national titles, Final Fours, the champions ledger, conference era/affiliation, vacated-result flags.</li>
        <li><b style={{ color: C.accent }}>Calibrated analyst estimates:</b> recruiting, poll-weeks, advanced metrics, pro-production counts, and era-split win% are relative approximations, not exact sourced season figures.</li>
        <li><b style={{ color: C.text }}>Nulls:</b> programs with negligible top-division presence in an era store null and are excluded from that era's aggregation (e.g. Gonzaga pre-1990 CBB).</li>
      </ul>
      <p style={{ color: C.dim, marginBottom: 0 }}>For exact figures, the intended source stack is Sports-Reference, NCAA record books, KenPom (post-2002 CBB), and SRS/SP+. This build uses curated aggregates so it runs with no external calls.</p>
    </div>
  );
}
