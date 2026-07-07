// Recharts-dependent views, split into their own chunk and lazy-loaded by
// App so the Ladder / Heatmap / Champions views don't pay for the chart lib.
import React from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { FAMILIES, rawFor } from "./data.js";
import { FONT_UI, FONT_MONO } from "./theme.js";
import { IconFlag } from "./icons.jsx";

// ----- SCATTER / QUADRANT -----
export function ScatterView({ C, scored, setDetail, spotlight }) {
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
        <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 12.5 }}>No two-sport programs match the current filters.</div>
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

// ----- COMPARE RADAR -----
const SERIES_COLORS = ["#5b9bff", "#f5b301", "#10b981", "#8b5cf6", "#ef4444"];

export function CompareChart({ C, programs, breakKey }) {
  const data = FAMILIES.map((f) => {
    const row = { family: f.short };
    programs.forEach((p) => { row[p.name] = p[breakKey]?.[f.key] ?? 0; });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} margin={{ top: 16, right: 30, bottom: 8, left: 30 }}>
        <PolarGrid stroke={C.grid} />
        <PolarAngleAxis dataKey="family" tick={{ fill: C.dim, fontSize: 11, fontFamily: FONT_UI }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: C.faint, fontSize: 9 }} stroke={C.border} angle={90} />
        {programs.map((p, i) => (
          <Radar key={p.name} name={p.name} dataKey={p.name} stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]} fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
        ))}
        <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: FONT_UI }} />
        <Tooltip contentStyle={{ background: C.panel2, border: `1px solid ${C.primary}`, borderRadius: 8, fontSize: 11.5, fontFamily: FONT_UI }}
          labelStyle={{ color: C.text }} itemStyle={{ color: C.text }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
