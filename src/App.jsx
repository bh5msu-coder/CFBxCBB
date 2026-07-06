import React, { useState, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// ============================================================================
// DATA NOTE / METHODOLOGY (see in-app panel for full text)
// HARD DATA (high confidence): national titles, Final Fours, conference era.
// CALIBRATED ESTIMATES (flagged): recruiting, poll-weeks, advanced, pro counts,
//   and era-split win%. These are analyst approximations on a 0-100 relative
//   scale, NOT exact sourced season figures. Do not cite as official records.
// Era buckets: E1 1976-89, E2 1990-99, E3 2000-09, E4 2010-25.
// Each metric per sport is stored as a 4-length era array [E1,E2,E3,E4] on a
// 0-100 relative scale (100 = best-in-class for that family over the window).
// ============================================================================

const ERAS = [
  { key: "E1", label: "1976–89", years: 14 },
  { key: "E2", label: "1990–99", years: 10 },
  { key: "E3", label: "2000–09", years: 10 },
  { key: "E4", label: "2010–25", years: 16 },
];

const FAMILIES = [
  { key: "champ", label: "Championships", short: "Champ" },
  { key: "winpct", label: "Win %", short: "Win%" },
  { key: "pro", label: "Pro Production", short: "Pro" },
  { key: "recruit", label: "Recruiting", short: "Recr" },
  { key: "poll", label: "Poll Presence", short: "Poll" },
  { key: "adv", label: "Advanced", short: "Adv" },
];

const DEFAULT_WEIGHTS = { champ: 30, winpct: 20, pro: 15, recruit: 10, poll: 15, adv: 10 };

// Conferences (current-ish primary affiliation for filtering)
// ---------------------------------------------------------------------------
// PROGRAM DATA
// cfb / cbb: each family -> [E1,E2,E3,E4] on 0-100 relative scale.
// null indicates the program had negligible/no top-division presence that era
// (e.g. mid-majors pre-rise). Nulls are excluded from era normalization.
// vacated: true flags programs with NCAA-vacated results.
// ---------------------------------------------------------------------------
const P = (champ, winpct, pro, recruit, poll, adv) => ({ champ, winpct, pro, recruit, poll, adv });

// ---------------------------------------------------------------------------
// RAW FIGURES (optional, audit/tooltip layer).
// When the scraper pipeline lands, attach a `_raw` object per program keyed by
// sport -> family -> short human string (e.g. cbb.champ = "2 titles · 16 F4").
// The UI shows these when present and silently omits them when absent, so the
// current estimate-based dataset keeps working untouched.
// A handful are seeded below from well-known program totals as a demonstration
// of the format; these are illustrative summaries, not full sourced records.
// ---------------------------------------------------------------------------
const RAW = {
  "Kansas":          { cbb: { champ: "3 titles · 16 Final Fours", winpct: "~.700 all-time", poll: "most AP weeks ranked (CBB)", adv: "KenPom top-10 staple" } },
  "Duke":            { cbb: { champ: "5 titles · 17 Final Fours", winpct: "elite .760+", pro: "most NBA lottery picks (mod. era)", poll: "perennial AP top-10" } },
  "North Carolina":  { cbb: { champ: "6 titles · 21 Final Fours", winpct: "winningest CBB program", poll: "perennial AP top-10" } },
  "Kentucky":        { cbb: { champ: "8 titles · 17 Final Fours", winpct: "winningest by %", pro: "NBA draft factory" } },
  "UCLA":            { cbb: { champ: "11 titles · 18 Final Fours", winpct: "Wooden dynasty 1964–75 anchors E1" } },
  "Connecticut":     { cbb: { champ: "6 titles (2 of last 2 played)", poll: "post-1990 surge" } },
  "Gonzaga":         { cbb: { champ: "2 F4 · 0 titles", winpct: "highest win% of the 2010s", recruit: "data begins ~2005" } },
  "Villanova":       { cbb: { champ: "3 titles · 6 Final Fours" } },
  "Indiana":         { cbb: { champ: "5 titles (last 1987)", adv: "Knight-era dominance in E1" } },
  "Alabama":         { cfb: { champ: "title-rich; CFP era peak", winpct: "Saban dynasty anchors E4", pro: "1st-round draft leader" } },
  "Ohio State":      { cfb: { champ: "natl titles + most Big Ten crowns", poll: "most AP weeks ranked (CFB)", pro: "1st-round factory" } },
  "Oklahoma":        { cfb: { champ: "7 natl titles · most conf titles", winpct: "top-3 all-time win%" } },
  "Notre Dame":      { cfb: { champ: "11 claimed titles (mostly pre-window)", poll: "independent AP mainstay" } },
  "Nebraska":        { cfb: { champ: "titles 1994–97 anchor E2", winpct: "dominant E1–E2, faded after" } },
  "Miami (FL)":      { cfb: { champ: "5 titles 1983–2001", pro: "NFL talent pipeline (esp. E2)", vacated: "2011 NCAA case" } },
  "USC":             { cfb: { champ: "titles incl. 2004 (BCS later vacated)", pro: "NFL 1st-round leader", vacated: "Bush-era vacated" } },
  "Michigan":        { cfb: { champ: "1997 split title · 2023 CFP title", winpct: "winningest CFB by %", vacated: "CBB Fab Five vacated" } },
  "Penn State":      { cfb: { champ: "1982 · 1986 titles", vacated: "Sandusky-case wins vacated/restored" } },
  "Georgia":         { cfb: { champ: "1980 · 2021 · 2022 titles", recruit: "elite E4 classes" } },
  "Florida":         { cfb: { champ: "1996 · 2006 · 2008 titles" }, cbb: { champ: "2006 · 2007 back-to-back" } },
  "Clemson":         { cfb: { champ: "1981 · 2016 · 2018 titles", recruit: "top-5 E4 classes" } },
  "LSU":             { cfb: { champ: "2003 · 2007 · 2019 titles" } },
  "Memphis":         { cbb: { champ: "2008 F4 run vacated", vacated: "Rose/Calipari case" } },
  "Louisville":      { cbb: { champ: "2013 title vacated", vacated: "2017 NCAA case" } },
};
const rawFor = (name, sport) => (RAW[name] && RAW[name][sport]) || null;

const PROGRAMS = [
  // ===== BLUE BLOOD / MARQUEE BOTH-SPORT =====
  { name: "Ohio State", conf: "Big Ten", cfb: P([88,82,90,98],[90,84,88,95],[92,80,90,98],[null,75,92,98],[92,85,90,96],[88,82,88,95]),
    cbb: P([35,55,68,72],[40,58,70,68],[45,60,72,70],[null,50,72,75],[42,60,70,70],[45,58,70,70]) },
  { name: "Michigan", conf: "Big Ten", vacated: true, cfb: P([85,80,72,82],[88,82,70,84],[85,78,72,86],[null,72,82,90],[88,82,74,84],[84,80,72,84]),
    cbb: P([55,78,55,70],[60,82,50,68],[45,55,60,72],[null,80,62,78],[55,80,55,72],[52,72,55,72]) },
  { name: "Texas", conf: "SEC", cfb: P([72,70,88,90],[68,66,84,80],[80,72,90,92],[null,78,92,94],[72,70,86,84],[74,70,86,86]),
    cbb: P([40,50,62,58],[42,52,60,55],[48,55,65,60],[null,55,68,64],[42,52,62,58],[44,52,62,58]) },
  { name: "USC", conf: "Big Ten", vacated: true, cfb: P([82,72,92,78],[78,70,82,72],[88,75,94,80],[null,80,96,82],[82,72,90,76],[80,72,88,76]),
    cbb: P([30,38,48,55],[32,40,45,52],[35,45,52,68],[null,42,55,72],[30,40,48,58],[32,42,50,62]) },
  { name: "Florida", conf: "SEC", cfb: P([55,68,82,84],[78,80,86,80],[72,78,90,88],[null,82,90,86],[68,76,88,82],[66,76,86,82]),
    cbb: P([null,40,82,68],[35,55,85,65],[40,60,88,70],[null,58,86,72],[30,50,82,66],[35,52,82,68]) },
  { name: "UCLA", conf: "Big Ten", cfb: P([60,55,58,52],[55,52,55,50],[62,58,62,55],[null,55,62,58],[58,54,56,52],[58,54,58,54]),
    cbb: P([98,72,80,68],[80,68,78,72],[78,70,82,70],[null,72,84,75],[95,72,80,70],[92,70,80,70]) },

  // ===== CFB-LEANING POWERS =====
  { name: "Alabama", conf: "SEC", cfb: P([90,68,80,100],[72,70,78,100],[78,72,86,100],[null,75,90,100],[88,70,82,100],[88,70,84,100]),
    cbb: P([42,48,45,55],[45,50,48,52],[48,52,52,58],[null,50,55,62],[40,48,46,55],[42,48,50,56]) },
  { name: "Oklahoma", conf: "SEC", cfb: P([92,78,82,88],[70,68,74,82],[80,76,86,90],[null,78,88,90],[90,78,84,86],[90,76,84,86]),
    cbb: P([45,68,55,52],[58,72,52,50],[50,60,68,55],[null,65,62,58],[48,68,55,52],[48,64,58,54]) },
  { name: "Notre Dame", conf: "Ind/ACC", cfb: P([88,82,90,82],[68,66,80,78],[82,78,90,84],[null,80,90,88],[88,80,84,82],[86,78,86,82]),
    cbb: P([38,42,40,52],[35,45,38,55],[40,48,45,62],[null,50,52,68],[35,42,42,55],[38,44,46,58]) },
  { name: "Penn State", conf: "Big Ten", vacated: true, cfb: P([85,78,80,80],[72,70,76,76],[78,74,82,84],[null,72,84,88],[84,78,78,80],[82,76,80,82]),
    cbb: P([28,32,35,40],[30,35,32,42],[32,38,38,48],[null,38,42,55],[26,32,34,44],[28,34,38,48]) },
  { name: "Nebraska", conf: "Big Ten", cfb: P([78,92,70,55],[88,94,72,52],[70,72,70,58],[null,72,72,60],[82,90,68,54],[80,88,70,55]),
    cbb: P([22,28,30,42],[25,30,28,40],[28,32,35,48],[null,35,40,52],[20,28,30,42],[24,30,34,46]) },
  { name: "Miami (FL)", conf: "ACC", vacated: true, cfb: P([85,80,95,70],[88,82,92,68],[80,76,90,72],[null,82,88,76],[86,80,90,70],[84,78,90,70]),
    cbb: P([18,22,32,52],[20,25,30,55],[24,30,38,62],[null,32,45,68],[16,22,32,55],[20,26,38,60]) },
  { name: "Georgia", conf: "SEC", cfb: P([72,72,78,96],[66,68,76,92],[74,74,84,98],[null,78,88,98],[72,72,80,96],[72,72,82,96]),
    cbb: P([28,35,40,48],[30,38,42,46],[34,42,46,52],[null,40,48,58],[26,35,40,48],[30,38,44,52]) },
  { name: "LSU", conf: "SEC", cfb: P([62,65,82,92],[64,66,80,84],[72,72,88,92],[null,76,90,92],[64,66,82,88],[64,66,84,88]),
    cbb: P([48,55,52,58],[52,58,50,55],[50,56,55,62],[null,54,58,68],[46,54,52,58],[48,54,55,60]) },
  { name: "Tennessee", conf: "SEC", cfb: P([72,78,80,78],[80,82,82,74],[74,76,84,80],[null,80,84,82],[76,80,82,78],[74,78,82,78]),
    cbb: P([35,45,52,72],[40,50,55,68],[42,52,60,75],[null,52,62,80],[34,46,54,72],[38,48,58,74]) },
  { name: "Auburn", conf: "SEC", cfb: P([62,68,76,80],[68,70,74,78],[68,72,82,82],[null,76,84,84],[64,68,76,80],[64,68,78,80]),
    cbb: P([30,40,42,70],[35,44,40,72],[38,46,46,78],[null,42,50,82],[28,40,42,72],[32,42,48,76]) },
  { name: "Penn State", conf: "Big Ten", hide: true, cfb: null, cbb: null },
  { name: "Florida State", conf: "ACC", cfb: P([55,82,80,72],[88,92,88,72],[80,78,84,76],[null,84,86,80],[78,88,82,72],[76,86,82,74]),
    cbb: P([30,38,48,68],[35,42,50,65],[38,46,55,72],[null,44,58,78],[28,38,48,68],[32,42,52,72]) },
  { name: "Clemson", conf: "ACC", cfb: P([62,60,68,92],[58,62,70,88],[62,64,76,94],[null,68,82,96],[60,62,70,90],[60,62,74,92]),
    cbb: P([25,32,38,52],[28,35,40,50],[30,38,44,56],[null,36,48,62],[22,32,38,52],[26,34,42,56]) },
  { name: "Oregon", conf: "Big Ten", cfb: P([42,55,60,90],[48,58,68,86],[50,60,74,92],[null,62,82,94],[44,56,68,88],[46,58,72,90]),
    cbb: P([45,40,45,62],[42,44,42,60],[40,46,48,68],[null,44,52,74],[40,40,44,62],[42,42,48,66]) },
  { name: "Washington", conf: "Big Ten", cfb: P([62,70,72,72],[68,72,70,68],[60,64,72,78],[null,68,76,82],[64,70,70,72],[64,68,72,74]),
    cbb: P([30,35,42,52],[32,38,44,50],[35,42,48,58],[null,40,52,64],[28,35,42,52],[32,38,46,56]) },
  { name: "Wisconsin", conf: "Big Ten", cfb: P([45,55,72,76],[52,60,76,72],[55,62,78,78],[null,64,80,80],[48,58,74,74],[50,60,76,76]),
    cbb: P([28,42,62,68],[35,48,68,64],[40,52,72,70],[null,50,72,76],[26,44,64,68],[32,48,68,70]) },
  { name: "Penn", conf: "Ivy", hide: true, cfb: null, cbb: null },

  // ===== CBB-LEANING POWERS =====
  { name: "Duke", conf: "ACC", cfb: P([18,22,30,40],[20,24,32,42],[24,28,38,48],[null,30,42,55],[16,22,32,44],[20,26,38,50]),
    cbb: P([72,98,96,94],[95,98,94,90],[90,96,96,92],[null,98,98,96],[90,98,96,92],[90,96,96,92]) },
  { name: "North Carolina", conf: "ACC", cfb: P([35,40,48,52],[38,42,50,54],[42,46,54,58],[null,48,58,64],[34,40,48,54],[38,44,52,58]),
    cbb: P([88,90,92,90],[92,94,90,86],[88,90,94,88],[null,92,94,90],[90,92,92,88],[88,90,92,88]) },
  { name: "Kentucky", conf: "SEC", cfb: P([28,32,42,58],[30,34,44,62],[34,40,50,68],[null,42,56,72],[26,32,42,60],[30,36,48,64]),
    cbb: P([90,92,90,96],[94,92,86,92],[90,92,94,90],[null,94,96,98],[92,92,90,94],[90,90,92,92]) },
  { name: "Kansas", conf: "Big 12", cfb: P([22,28,55,42],[25,30,58,45],[28,34,62,50],[null,36,64,56],[20,28,56,44],[24,32,60,50]),
    cbb: P([82,88,92,96],[90,92,94,94],[86,90,96,94],[null,92,96,96],[88,90,94,96],[86,90,94,96]) },
  { name: "Indiana", conf: "Big Ten", cfb: P([22,28,32,42],[25,30,34,45],[28,32,38,50],[null,34,44,56],[20,28,32,46],[24,30,38,50]),
    cbb: P([92,72,62,55],[78,68,58,58],[72,64,62,64],[null,66,68,70],[90,72,62,58],[86,68,62,60]) },
  { name: "Louisville", conf: "ACC", vacated: true, cfb: P([45,52,62,70],[50,56,66,68],[52,58,70,74],[null,60,74,78],[44,52,64,70],[48,56,68,72]),
    cbb: P([72,68,75,82],[70,72,78,80],[68,74,82,84],[null,72,84,86],[70,70,76,82],[68,72,80,82]) },
  { name: "Michigan State", conf: "Big Ten", cfb: P([55,52,58,70],[52,55,62,72],[58,60,68,76],[null,62,72,80],[54,54,62,72],[56,58,66,74]),
    cbb: P([45,82,88,86],[55,86,90,82],[58,84,92,84],[null,88,94,88],[44,84,90,84],[50,84,90,84]) },
  { name: "Syracuse", conf: "ACC", cfb: P([55,52,48,42],[50,52,46,44],[52,54,52,48],[null,54,56,54],[52,52,48,44],[52,52,50,46]),
    cbb: P([72,78,80,68],[80,82,84,65],[78,80,86,70],[null,82,88,74],[72,80,82,68],[72,80,84,70]) },
  { name: "Villanova", conf: "Big East", cfb: null,
    cbb: P([72,55,58,92],[60,58,62,90],[58,60,68,94],[null,62,72,96],[70,55,60,92],[68,56,64,94]) },
  { name: "Georgetown", conf: "Big East", cfb: null,
    cbb: P([88,72,52,48],[78,68,50,46],[72,64,55,52],[null,66,58,56],[86,72,52,48],[82,68,55,50]) },
  { name: "Connecticut", conf: "Big East", cfb: P([28,40,48,38],[35,48,55,40],[40,52,60,45],[null,55,64,50],[26,42,52,40],[32,48,58,44]),
    cbb: P([35,82,92,88],[72,88,94,82],[78,90,96,86],[null,90,96,92],[34,84,94,88],[58,86,94,88]) },
  { name: "Arizona", conf: "Big 12", cfb: P([35,42,40,42],[40,46,42,44],[44,48,46,48],[null,48,52,54],[34,42,40,44],[38,46,44,48]),
    cbb: P([55,88,82,80],[82,92,84,78],[80,90,86,82],[null,90,88,84],[54,88,84,80],[68,88,84,80]) },
  { name: "Memphis", conf: "AAC", vacated: true, cfb: P([18,22,28,32],[20,24,30,34],[24,28,34,40],[null,30,40,46],[16,22,28,36],[20,26,34,40]),
    cbb: P([45,55,82,62],[50,58,84,60],[52,60,86,64],[null,58,82,68],[44,55,84,62],[48,56,84,64]) },
  { name: "UNLV", conf: "Mountain West", cfb: null,
    cbb: P([78,68,42,38],[55,50,38,40],[48,46,42,44],[null,48,48,48],[80,66,42,40],[74,58,44,42]) },
  { name: "Gonzaga", conf: "WCC", cfb: null,
    cbb: P([null,42,82,98],[35,55,86,96],[40,60,90,98],[null,58,92,98],[null,45,84,98],[null,55,88,98]) },
  { name: "Houston", conf: "Big 12", cfb: P([48,52,42,72],[50,55,44,74],[52,58,48,80],[null,58,52,84],[48,52,42,74],[50,55,48,78]),
    cbb: P([72,42,40,90],[55,45,42,92],[52,48,48,94],[null,46,55,96],[70,42,42,92],[66,46,50,94]) },
  { name: "Wichita State", conf: "AAC", cfb: null,
    cbb: P([42,38,52,78],[40,42,54,72],[38,44,58,76],[null,42,62,78],[40,38,54,78],[40,42,58,76]) },

  // ===== RISERS / NON-POWER CFB =====
  { name: "Boise State", conf: "Mountain West", cfb: P([null,42,78,82],[null,48,82,80],[null,52,86,84],[null,55,82,86],[null,44,82,82],[null,50,84,84]),
    cbb: P([null,28,35,42],[null,30,38,44],[null,34,42,48],[null,38,46,52],[null,28,38,46],[null,32,42,48]) },
  { name: "BYU", conf: "Big 12", cfb: P([62,55,52,60],[68,58,54,62],[64,60,58,68],[null,62,62,72],[62,56,54,62],[62,58,58,66]),
    cbb: P([42,48,52,62],[45,52,55,60],[48,55,58,66],[null,52,62,70],[40,48,52,62],[44,52,56,66]) },
  { name: "TCU", conf: "Big 12", cfb: P([42,40,55,82],[45,44,60,80],[48,48,66,86],[null,52,72,88],[40,42,58,82],[44,46,64,84]),
    cbb: P([22,28,32,55],[25,30,35,52],[28,34,40,60],[null,38,46,66],[20,28,34,56],[24,32,40,60]) },
  { name: "Utah", conf: "Big 12", cfb: P([45,52,62,72],[50,56,68,70],[54,60,74,76],[null,62,78,80],[44,52,64,72],[48,56,70,76]),
    cbb: P([52,58,55,52],[58,62,52,50],[60,64,58,56],[null,62,62,60],[50,58,55,52],[54,60,58,56]) },
  { name: "Virginia Tech", conf: "ACC", cfb: P([42,52,72,68],[55,62,78,66],[58,66,82,70],[null,68,84,74],[44,54,74,68],[50,60,78,70]),
    cbb: P([22,28,38,52],[25,30,40,50],[28,34,44,56],[null,38,48,62],[20,28,38,52],[24,32,42,56]) },
  { name: "Iowa", conf: "Big Ten", cfb: P([55,52,62,72],[58,56,66,70],[60,60,70,76],[null,62,74,80],[54,52,64,72],[56,56,68,76]),
    cbb: P([42,48,45,58],[45,52,48,55],[48,55,52,62],[null,52,58,68],[40,48,46,58],[44,52,50,62]) },
  { name: "Texas A&M", conf: "SEC", cfb: P([45,55,70,78],[52,60,74,76],[56,64,78,82],[null,68,82,86],[46,56,72,78],[50,60,76,80]),
    cbb: P([28,35,48,62],[30,38,50,60],[34,42,54,66],[null,46,58,72],[26,35,48,62],[30,40,52,66]) },
  { name: "Oklahoma State", conf: "Big 12", cfb: P([55,58,60,72],[52,56,64,74],[56,60,68,80],[null,62,72,82],[52,56,62,74],[54,58,66,78]),
    cbb: P([55,62,52,55],[58,66,50,52],[60,68,55,58],[null,64,58,62],[54,62,52,55],[56,64,55,58]) },
  { name: "West Virginia", conf: "Big 12", cfb: P([55,58,68,62],[58,62,72,60],[62,66,76,64],[null,68,78,68],[54,58,68,62],[58,62,72,64]),
    cbb: P([42,48,55,62],[45,52,58,60],[48,55,62,66],[null,54,66,70],[40,48,56,62],[44,52,60,66]) },
  { name: "Pittsburgh", conf: "ACC", cfb: P([72,55,52,55],[58,54,55,56],[55,58,60,60],[null,60,64,64],[68,55,52,56],[64,56,58,60]),
    cbb: P([35,42,62,52],[38,46,66,50],[42,52,70,56],[null,56,72,62],[34,42,64,52],[38,48,68,56]) },
  { name: "Maryland", conf: "Big Ten", cfb: P([42,48,55,58],[45,52,58,56],[48,55,62,62],[null,58,66,68],[40,48,56,58],[44,52,60,62]),
    cbb: P([45,55,68,62],[52,60,72,60],[55,64,76,66],[null,62,74,70],[44,55,70,62],[48,60,72,66]) },
  { name: "Illinois", conf: "Big Ten", cfb: P([45,42,48,55],[42,46,52,54],[46,50,56,60],[null,52,60,66],[42,42,48,56],[44,46,54,60]),
    cbb: P([55,62,72,68],[58,66,76,64],[60,68,80,70],[null,66,78,74],[54,62,74,68],[56,66,78,70]) },
  { name: "Purdue", conf: "Big Ten", cfb: P([42,45,42,52],[45,48,46,50],[48,52,50,56],[null,52,56,62],[40,45,42,52],[44,48,48,56]),
    cbb: P([55,62,68,82],[58,66,72,80],[60,68,76,86],[null,66,78,88],[54,62,70,84],[56,66,74,86]) },
  { name: "Cincinnati", conf: "Big 12", cfb: P([35,42,55,68],[40,48,60,66],[44,52,66,72],[null,56,70,76],[34,42,56,68],[38,48,62,72]),
    cbb: P([55,72,68,55],[68,76,64,52],[64,74,68,58],[null,72,66,62],[54,72,68,55],[58,72,68,56]) },
  { name: "Stanford", conf: "ACC", cfb: P([45,52,62,72],[55,58,68,70],[58,62,74,76],[null,64,78,80],[46,54,64,72],[50,58,70,76]),
    cbb: P([42,55,62,52],[52,62,58,50],[55,64,62,56],[null,62,64,60],[40,55,62,52],[46,58,62,56]) },
  { name: "California", conf: "ACC", cfb: P([42,45,52,48],[45,48,55,46],[48,52,58,52],[null,54,62,56],[40,45,52,48],[44,48,56,52]),
    cbb: P([40,45,55,48],[42,48,58,46],[45,52,62,52],[null,55,64,56],[38,45,56,48],[42,48,60,52]) },
  { name: "Iowa State", conf: "Big 12", cfb: P([35,42,52,62],[40,46,56,64],[44,50,60,70],[null,52,64,74],[34,42,52,64],[38,46,58,68]),
    cbb: P([35,48,55,72],[42,52,58,70],[46,55,62,76],[null,52,66,80],[34,48,56,72],[38,52,60,76]) },
  { name: "Baylor", conf: "Big 12", cfb: P([35,40,52,78],[42,46,56,76],[46,50,62,82],[null,54,68,86],[34,40,54,78],[38,46,60,82]),
    cbb: P([35,42,55,88],[40,46,58,86],[44,52,64,90],[null,55,70,92],[34,42,56,88],[38,48,62,90]) },
  { name: "Colorado", conf: "Big 12", cfb: P([62,68,58,55],[72,74,62,56],[68,70,64,60],[null,72,68,66],[64,68,58,58],[66,70,62,60]),
    cbb: P([28,35,42,52],[32,38,45,50],[35,42,48,56],[null,46,55,62],[26,35,44,52],[30,40,48,56]) },
  { name: "Mississippi", conf: "SEC", cfb: P([45,48,55,72],[48,52,58,70],[52,56,62,78],[null,58,68,82],[44,48,56,72],[48,52,60,76]),
    cbb: P([28,35,42,52],[32,38,44,50],[35,42,48,56],[null,46,54,62],[26,35,42,52],[30,40,48,56]) },
  { name: "South Carolina", conf: "SEC", cfb: P([35,42,52,62],[40,46,56,60],[44,50,62,66],[null,54,66,72],[34,42,54,62],[38,48,60,66]),
    cbb: P([28,35,48,58],[32,38,50,55],[35,42,55,62],[null,46,60,68],[26,35,48,58],[30,40,54,62]) },
  { name: "Missouri", conf: "SEC", cfb: P([45,52,55,62],[50,56,60,64],[54,60,66,70],[null,62,70,74],[44,52,56,64],[48,56,62,68]),
    cbb: P([42,55,58,52],[52,60,62,50],[55,62,66,56],[null,62,68,60],[40,55,60,52],[46,58,64,56]) },
  { name: "NC State", conf: "ACC", cfb: P([42,45,52,55],[45,48,55,54],[48,52,58,60],[null,54,62,66],[40,45,52,56],[44,48,56,60]),
    cbb: P([72,52,55,62],[58,55,58,60],[55,58,62,66],[null,60,66,70],[70,52,55,62],[66,55,60,64]) },
  { name: "Virginia", conf: "ACC", cfb: P([35,42,52,55],[40,46,56,54],[44,50,60,60],[null,54,64,66],[34,42,52,56],[38,48,58,60]),
    cbb: P([42,48,55,82],[48,52,58,80],[52,56,62,86],[null,58,68,88],[40,48,56,82],[44,52,62,86]) },
  { name: "Texas Tech", conf: "Big 12", cfb: P([42,48,55,62],[46,52,58,60],[50,56,62,66],[null,58,68,72],[40,48,56,62],[44,52,60,66]),
    cbb: P([28,38,45,72],[32,42,48,70],[36,46,52,76],[null,50,58,80],[26,38,46,72],[30,44,52,76]) },
  { name: "Marquette", conf: "Big East", cfb: null,
    cbb: P([62,55,62,72],[58,58,66,70],[60,62,70,76],[null,64,72,80],[60,55,64,72],[60,58,68,76]) },
  { name: "Saint John's", conf: "Big East", cfb: null,
    cbb: P([72,62,48,52],[68,58,46,55],[62,55,50,60],[null,56,55,66],[70,62,48,55],[68,58,52,58]) },
  { name: "Xavier", conf: "Big East", cfb: null,
    cbb: P([35,52,68,68],[48,58,72,65],[52,62,76,70],[null,60,78,74],[34,52,70,68],[42,56,74,70]) },
  { name: "Creighton", conf: "Big East", cfb: null,
    cbb: P([35,42,55,68],[42,48,58,66],[46,52,62,72],[null,55,68,76],[34,42,56,68],[38,48,62,72]) },
  { name: "Providence", conf: "Big East", cfb: null,
    cbb: P([55,48,52,58],[50,52,55,56],[52,55,58,62],[null,56,62,66],[54,48,52,58],[52,52,56,60]) },
  { name: "Seton Hall", conf: "Big East", cfb: null,
    cbb: P([42,62,48,52],[58,66,46,50],[55,62,52,56],[null,64,58,60],[40,62,48,52],[46,62,52,56]) },
];

const ACTIVE = PROGRAMS.filter((p) => !p.hide);

const CONFS = ["All", ...Array.from(new Set(ACTIVE.map((p) => p.conf))).sort()];

// ---------------------------------------------------------------------------
// SCORING ENGINE
// ---------------------------------------------------------------------------
function eraWeights(selectedEras, recency) {
  // recency 0 = equal weight, 1 = heavy recent. Decay applied across era index.
  const base = ERAS.map((e, i) => (selectedEras[e.key] ? 1 : 0));
  if (recency === 0) return base;
  const decay = 1 + recency * 2.2; // tune
  return base.map((b, i) => b * Math.pow(decay, i));
}

function programFamilyScore(prog, sport, fam, selectedEras, recency) {
  const arr = prog[sport] ? prog[sport][fam] : null;
  if (!arr) return null;
  const w = eraWeights(selectedEras, recency);
  let num = 0, den = 0;
  arr.forEach((v, i) => {
    if (v == null) return;
    num += v * w[i];
    den += w[i];
  });
  if (den === 0) return null;
  return num / den;
}

function computeSportScore(prog, sport, weights, selectedEras, recency) {
  if (!prog[sport]) return null;
  let total = 0, wsum = 0;
  const breakdown = {};
  FAMILIES.forEach((f) => {
    const s = programFamilyScore(prog, sport, f.key, selectedEras, recency);
    breakdown[f.key] = s;
    if (s == null) return;
    total += s * weights[f.key];
    wsum += weights[f.key];
  });
  if (wsum === 0) return null;
  return { score: total / wsum, breakdown };
}

function tierFor(score) {
  if (score == null) return null;
  if (score >= 82) return "Blue Blood";
  if (score >= 70) return "Elite";
  if (score >= 58) return "Power";
  if (score >= 45) return "Solid";
  return "Rising";
}

const TIER_META = {
  "Blue Blood": { color: "#fbbf24", order: 0 },
  Elite: { color: "#60a5fa", order: 1 },
  Power: { color: "#34d399", order: 2 },
  Solid: { color: "#a78bfa", order: 3 },
  Rising: { color: "#94a3b8", order: 4 },
};

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
export default function App() {
  const [view, setView] = useState("ladder");
  const [sport, setSport] = useState("combined"); // cfb | cbb | combined
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [selectedEras, setSelectedEras] = useState({ E1: true, E2: true, E3: true, E4: true });
  const [recency, setRecency] = useState(0);
  const [conf, setConf] = useState("All");
  const [search, setSearch] = useState("");
  const [spotlight, setSpotlight] = useState([]); // names
  const [detail, setDetail] = useState(null);
  const [onField, setOnField] = useState(false); // vacated toggle: false = official
  const [showMethod, setShowMethod] = useState(false);
  const [sortKey, setSortKey] = useState("combined");
  const [sortDir, setSortDir] = useState("desc");

  const scored = useMemo(() => {
    return ACTIVE.map((p) => {
      const cfb = computeSportScore(p, "cfb", weights, selectedEras, recency);
      const cbb = computeSportScore(p, "cbb", weights, selectedEras, recency);
      let combined = null, balanceBonus = 0;
      if (cfb && cbb) {
        const avg = (cfb.score + cbb.score) / 2;
        const minS = Math.min(cfb.score, cbb.score);
        balanceBonus = (minS / 100) * 6; // up to +6 for being strong in both
        combined = Math.min(100, avg + balanceBonus);
      } else if (cfb) combined = cfb.score * 0.92;
      else if (cbb) combined = cbb.score * 0.92;
      const active = sport === "combined" ? combined : sport === "cfb" ? cfb?.score : cbb?.score;
      return { ...p, cfbScore: cfb?.score ?? null, cbbScore: cbb?.score ?? null, cfbBreak: cfb?.breakdown, cbbBreak: cbb?.breakdown, combined, balanceBonus, active };
    });
  }, [weights, selectedEras, recency, sport]);

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

  const resetWeights = () => setWeights({ ...DEFAULT_WEIGHTS });
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);

  const toggleSpotlight = (name) =>
    setSpotlight((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  // ----- styles -----
  const C = {
    bg: "#0a0e17", panel: "#0f1626", panel2: "#131c30", border: "#1e293b",
    text: "#e2e8f0", dim: "#64748b", accent: "#22d3ee", accent2: "#f59e0b",
    grid: "#1a2438",
  };
  const mono = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: mono, minHeight: "100vh", padding: "16px", fontSize: 13 }}>
      <style>{`
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; height:4px; background:${C.grid}; border-radius:2px; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:${C.accent}; cursor:pointer; border:2px solid ${C.bg}; }
        .btn{ background:${C.panel2}; border:1px solid ${C.border}; color:${C.dim}; padding:6px 12px; border-radius:5px; cursor:pointer; font-family:${mono}; font-size:12px; transition:all .15s; }
        .btn:hover{ border-color:${C.accent}; color:${C.text}; }
        .btn.on{ background:${C.accent}; color:${C.bg}; border-color:${C.accent}; font-weight:700; }
        .row{ transition: background .2s; }
        .row:hover{ background:${C.panel2}; }
        .chip{ font-size:10px; padding:2px 7px; border-radius:10px; display:inline-block; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
            <span style={{ color: C.accent2 }}>◈</span> CFB <span style={{ color: C.dim }}>×</span> CBB <span style={{ color: C.accent }}>POWER INDEX</span>
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginTop: 3 }}>50-Season Program Rankings · 1976–2025 · {ACTIVE.length} programs · era-bucketed aggregates</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["ladder", "▤ Ladder"], ["scatter", "◇ Quadrant"], ["heatmap", "▦ Heatmap"]].map(([k, l]) => (
            <button key={k} className={`btn ${view === k ? "on" : ""}`} onClick={() => setView(k)}>{l}</button>
          ))}
          <button className="btn" onClick={() => setShowMethod((s) => !s)}>ⓘ Methods</button>
        </div>
      </div>

      {showMethod && <MethodPanel C={C} close={() => setShowMethod(false)} />}

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* CONTROL RAIL */}
        <div style={{ width: 250, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sport */}
          <Section C={C} title="SPORT">
            <div style={{ display: "flex", gap: 5 }}>
              {[["cfb", "Football"], ["cbb", "Basketball"], ["combined", "Combined"]].map(([k, l]) => (
                <button key={k} className={`btn ${sport === k ? "on" : ""}`} style={{ flex: 1, padding: "6px 4px", fontSize: 11 }} onClick={() => setSport(k)}>{l}</button>
              ))}
            </div>
          </Section>

          {/* Era */}
          <Section C={C} title="ERA WINDOW">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {ERAS.map((e) => (
                <button key={e.key} className={`btn ${selectedEras[e.key] ? "on" : ""}`} style={{ fontSize: 11, padding: "5px 4px" }}
                  onClick={() => setSelectedEras((s) => ({ ...s, [e.key]: !s[e.key] }))}>{e.label}</button>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Label C={C} l="RECENCY WEIGHTING" v={recency === 0 ? "equal" : `+${recency.toFixed(1)}`} />
              <input type="range" min={0} max={1} step={0.1} value={recency} style={{ width: "100%" }} onChange={(e) => setRecency(+e.target.value)} />
              <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 9 }}><span>equal</span><span>recent↑</span></div>
            </div>
          </Section>

          {/* Weights */}
          <Section C={C} title={`METRIC WEIGHTS · Σ${totalW}`}>
            {FAMILIES.map((f) => (
              <div key={f.key} style={{ marginBottom: 7 }}>
                <Label C={C} l={f.label} v={weights[f.key]} />
                <input type="range" min={0} max={40} step={1} value={weights[f.key]} style={{ width: "100%" }}
                  onChange={(e) => setWeights((w) => ({ ...w, [f.key]: +e.target.value }))} />
              </div>
            ))}
            <button className="btn" style={{ width: "100%", marginTop: 4 }} onClick={resetWeights}>↺ Reset defaults</button>
          </Section>

          {/* Filters */}
          <Section C={C} title="FILTERS">
            <Label C={C} l="CONFERENCE" v="" />
            <select value={conf} onChange={(e) => setConf(e.target.value)}
              style={{ width: "100%", background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px", fontFamily: mono, fontSize: 11, marginBottom: 9 }}>
              {CONFS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Label C={C} l="SEARCH" v="" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="filter by name…"
              style={{ width: "100%", background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px", fontFamily: mono, fontSize: 11 }} />
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.dim, fontSize: 11 }}>Vacated results</span>
              <button className={`btn ${onField ? "on" : ""}`} style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setOnField((s) => !s)}>
                {onField ? "ON-FIELD" : "OFFICIAL"}
              </button>
            </div>
            <div style={{ color: C.dim, fontSize: 9, marginTop: 4, lineHeight: 1.4 }}>
              {onField ? "Counting vacated W/titles as played." : "Using NCAA official (vacated removed)."}
            </div>
          </Section>
        </div>

        {/* MAIN PANEL */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {view === "ladder" && <LadderView C={C} ranked={ranked} sport={sport} spotlight={spotlight} toggleSpotlight={toggleSpotlight} setDetail={setDetail} onField={onField} />}
          {view === "scatter" && <ScatterView C={C} scored={filtered} setDetail={setDetail} spotlight={spotlight} />}
          {view === "heatmap" && <HeatmapView C={C} ranked={ranked} sport={sport} sortKey={sortKey} setSortKey={setSortKey} sortDir={sortDir} setSortDir={setSortDir} setDetail={setDetail} />}
        </div>
      </div>

      {detail && <DetailModal C={C} prog={detail} close={() => setDetail(null)} weights={weights} onField={onField} />}

      <div style={{ marginTop: 18, paddingTop: 10, borderTop: `1px solid ${C.border}`, color: C.dim, fontSize: 10, lineHeight: 1.5 }}>
        Championship & Final Four data: high-confidence aggregates. Recruiting / poll-weeks / advanced / pro / era-split win% are <span style={{ color: C.accent2 }}>calibrated analyst estimates on a relative 0–100 scale</span> — not exact sourced season figures. Open Methods for full notes. Vacated programs flagged ⚑.
      </div>
    </div>
  );
}

function Section({ C, title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 11 }}>
      <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
function Label({ C, l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginBottom: 3 }}>
      <span>{l}</span>{v !== "" && <span style={{ color: C.text, fontWeight: 700 }}>{v}</span>}
    </div>
  );
}

// ----- LADDER VIEW -----
function LadderView({ C, ranked, sport, spotlight, toggleSpotlight, setDetail, onField }) {
  const tiers = ["Blue Blood", "Elite", "Power", "Solid", "Rising"];
  const grouped = {};
  tiers.forEach((t) => (grouped[t] = []));
  ranked.forEach((p) => {
    const t = tierFor(p.active);
    if (t) grouped[t].push(p);
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tiers.map((t) => {
        const meta = TIER_META[t];
        const list = grouped[t];
        if (!list.length) return null;
        return (
          <div key={t} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 7, padding: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: meta.color, fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>{t.toUpperCase()}</span>
              <span style={{ color: C.dim, fontSize: 11 }}>{list.length} programs</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((p, i) => {
                const spot = spotlight.includes(p.name);
                return (
                  <div key={p.name} className="row" onClick={() => setDetail(p)}
                    style={{ cursor: "pointer", background: spot ? C.panel2 : C.bg, border: `1px solid ${spot ? C.accent : C.border}`, borderRadius: 6, padding: "7px 10px", display: "flex", alignItems: "center", gap: 9, minWidth: 188 }}>
                    <span style={{ color: meta.color, fontWeight: 800, fontSize: 15, width: 34, textAlign: "right" }}>{Math.round(p.active)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name} {p.vacated && <span title="Has NCAA-vacated results" style={{ color: C.accent2 }}>⚑</span>}</div>
                      <div style={{ color: C.dim, fontSize: 9.5 }}>{p.conf}{sport === "combined" && p.cfbScore != null && p.cbbScore != null ? ` · F${Math.round(p.cfbScore)}/B${Math.round(p.cbbScore)}` : ""}</div>
                    </div>
                    <button className={`btn ${spot ? "on" : ""}`} style={{ fontSize: 9, padding: "2px 6px" }} onClick={(e) => { e.stopPropagation(); toggleSpotlight(p.name); }}>★</button>
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
      <g style={{ cursor: "pointer" }} onClick={() => setDetail(payload.raw)}>
        <circle cx={cx} cy={cy} r={r} fill={spot ? C.accent2 : C.accent} fillOpacity={spot ? 0.85 : 0.4} stroke={spot ? C.accent2 : C.accent} strokeWidth={1} />
        {(payload.z > 72 || spot) && <text x={cx} y={cy - r - 3} textAnchor="middle" fill={C.text} fontSize={9} fontFamily="monospace">{payload.name}</text>}
      </g>
    );
  };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>Two-Sport Quadrant</span>
        <span style={{ color: C.dim, fontSize: 10 }}>bubble = combined score · click to expand</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 8, right: 12, color: C.accent2, fontSize: 10, fontWeight: 700, zIndex: 1, opacity: 0.7 }}>TWO-SPORT BLUE BLOODS ↗</div>
        <div style={{ position: "absolute", top: 8, left: 56, color: C.dim, fontSize: 10, zIndex: 1, opacity: 0.6 }}>↖ HOOPS SCHOOLS</div>
        <div style={{ position: "absolute", bottom: 36, right: 12, color: C.dim, fontSize: 10, zIndex: 1, opacity: 0.6 }}>FOOTBALL SCHOOLS ↘</div>
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 0 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis type="number" dataKey="x" domain={[20, 100]} name="CFB" tick={{ fill: C.dim, fontSize: 10 }} stroke={C.border}
              label={{ value: "FOOTBALL SCORE →", position: "bottom", fill: C.dim, fontSize: 10 }} />
            <YAxis type="number" dataKey="y" domain={[20, 100]} name="CBB" tick={{ fill: C.dim, fontSize: 10 }} stroke={C.border}
              label={{ value: "BASKETBALL SCORE →", angle: -90, position: "insideLeft", fill: C.dim, fontSize: 10 }} />
            <ReferenceLine x={60} stroke={C.border} strokeDasharray="3 3" />
            <ReferenceLine y={60} stroke={C.border} strokeDasharray="3 3" />
            <Tooltip cursor={{ strokeDasharray: "3 3", stroke: C.accent }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const rf = rawFor(d.name, "cfb");
                const rb = rawFor(d.name, "cbb");
                const note = (rf && (rf.champ || rf.winpct)) || (rb && (rb.champ || rb.winpct)) || null;
                return (
                  <div style={{ background: C.panel2, border: `1px solid ${C.accent}`, borderRadius: 6, padding: 9, fontSize: 11, fontFamily: "monospace", maxWidth: 220 }}>
                    <div style={{ fontWeight: 700, color: C.text }}>{d.name} {d.vacated && <span style={{ color: C.accent2 }}>⚑</span>}</div>
                    <div style={{ color: C.dim }}>{d.conf}</div>
                    <div style={{ color: C.accent }}>CFB {Math.round(d.x)} · CBB {Math.round(d.y)}</div>
                    <div style={{ color: C.accent2 }}>Combined {Math.round(d.z)}</div>
                    {note && <div style={{ color: C.text, fontStyle: "italic", marginTop: 4, fontSize: 10, lineHeight: 1.4 }}>{note}</div>}
                  </div>
                );
              }} />
            <Scatter data={data} shape={<Dot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ----- HEATMAP VIEW -----
function HeatmapView({ C, ranked, sport, sortKey, setSortKey, sortDir, setSortDir, setDetail }) {
  const sportKey = sport === "cbb" ? "cbb" : "cfb";
  const useBreak = sport === "combined" ? "cfbBreak" : sport === "cbb" ? "cbbBreak" : "cfbBreak";
  const rows = useMemo(() => {
    const r = ranked.map((p) => {
      const b = p[useBreak] || {};
      return { ...p, _b: b };
    });
    const dir = sortDir === "desc" ? -1 : 1;
    return r.sort((a, b) => {
      let av, bv;
      if (sortKey === "combined") { av = a.active; bv = b.active; }
      else if (sortKey === "name") { return a.name.localeCompare(b.name) * dir; }
      else { av = a._b[sortKey] ?? -1; bv = b._b[sortKey] ?? -1; }
      return ((av ?? -1) - (bv ?? -1)) * dir;
    });
  }, [ranked, sortKey, sortDir, useBreak]);

  const sortBy = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };
  const cellColor = (v) => {
    if (v == null) return C.panel;
    const t = v / 100;
    // teal -> amber gradient on dark
    const r = Math.round(20 + t * 230), g = Math.round(60 + t * 150), b = Math.round(90 - t * 50);
    return `rgba(${r},${g},${b},${0.25 + t * 0.55})`;
  };
  const Th = ({ k, label, w }) => (
    <th onClick={() => sortBy(k)} style={{ cursor: "pointer", padding: "8px 6px", color: sortKey === k ? C.accent : C.dim, fontSize: 10, textAlign: k === "name" ? "left" : "center", whiteSpace: "nowrap", width: w, userSelect: "none" }}>
      {label}{sortKey === k ? (sortDir === "desc" ? " ▾" : " ▴") : ""}
    </th>
  );
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 4, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={{ padding: "8px 6px", color: C.dim, fontSize: 10, textAlign: "center", width: 28 }}>#</th>
            <Th k="name" label="PROGRAM" />
            <Th k="combined" label={sport === "combined" ? "COMB" : "SCORE"} />
            {FAMILIES.map((f) => <Th key={f.key} k={f.key} label={f.short.toUpperCase()} />)}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.name} className="row" style={{ cursor: "pointer", borderBottom: `1px solid ${C.grid}` }} onClick={() => setDetail(p)}>
              <td style={{ padding: "6px", color: C.dim, fontSize: 11, textAlign: "center" }}>{i + 1}</td>
              <td style={{ padding: "6px 8px", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                {p.name} {p.vacated && <span style={{ color: C.accent2 }}>⚑</span>}
                <div style={{ color: C.dim, fontSize: 9, fontWeight: 400 }}>{p.conf}</div>
              </td>
              <td style={{ padding: 4, textAlign: "center", fontWeight: 800, color: TIER_META[tierFor(p.active)]?.color, fontSize: 14 }}>{Math.round(p.active)}</td>
              {FAMILIES.map((f) => {
                const v = p._b[f.key];
                return (
                  <td key={f.key} style={{ padding: 4, textAlign: "center" }}>
                    <div style={{ background: cellColor(v), borderRadius: 4, padding: "5px 2px", color: v == null ? C.dim : C.text, fontSize: 11, fontWeight: 600 }}>
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

// ----- DETAIL MODAL -----
function DetailModal({ C, prog, close, weights, onField }) {
  const mono = "monospace";
  const Bar = ({ label, val, w, raw }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: C.dim }}>{label} <span style={{ color: C.accent2, fontSize: 9 }}>·w{w}</span></span>
        <span style={{ fontWeight: 700 }}>{val == null ? "—" : Math.round(val)}</span>
      </div>
      <div style={{ height: 6, background: C.grid, borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${val ?? 0}%`, background: `linear-gradient(90deg,${C.accent},${C.accent2})`, borderRadius: 3, transition: "width .3s" }} />
      </div>
      {raw && <div style={{ color: C.accent, fontSize: 9.5, marginTop: 2, fontStyle: "italic" }}>↳ {raw}</div>}
    </div>
  );
  const SportBlock = ({ title, score, brk, sportKey }) => {
    const raw = rawFor(prog.name, sportKey);
    if (score == null) return (
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ color: C.dim, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: C.dim, fontSize: 11, fontStyle: "italic" }}>No meaningful top-division presence in window.</div>
      </div>
    );
    return (
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ color: C.text, fontWeight: 700 }}>{title}</span>
          <span style={{ fontWeight: 800, color: TIER_META[tierFor(score)]?.color }}>{Math.round(score)} · {tierFor(score)}</span>
        </div>
        {FAMILIES.map((f) => <Bar key={f.key} label={f.label} val={brk?.[f.key]} w={weights[f.key]} raw={raw?.[f.key]} />)}
      </div>
    );
  };
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 10, padding: 20, maxWidth: 620, width: "100%", maxHeight: "88vh", overflowY: "auto", fontFamily: mono }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{prog.name} {prog.vacated && <span title="NCAA-vacated results" style={{ color: C.accent2, fontSize: 14 }}>⚑ vacated</span>}</div>
            <div style={{ color: C.dim, fontSize: 11 }}>{prog.conf}</div>
          </div>
          <button className="btn" onClick={close}>✕ close</button>
        </div>
        <div style={{ display: "flex", gap: 14, margin: "14px 0", flexWrap: "wrap" }}>
          <Stat C={C} l="Combined" v={prog.combined} big />
          <Stat C={C} l="Football" v={prog.cfbScore} />
          <Stat C={C} l="Basketball" v={prog.cbbScore} />
          {prog.balanceBonus > 0.3 && <Stat C={C} l="2-Sport Bonus" v={`+${prog.balanceBonus.toFixed(1)}`} raw />}
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <SportBlock title="◈ FOOTBALL BREAKDOWN" score={prog.cfbScore} brk={prog.cfbBreak} sportKey="cfb" />
          <SportBlock title="◇ BASKETBALL BREAKDOWN" score={prog.cbbScore} brk={prog.cbbBreak} sportKey="cbb" />
        </div>
        {prog.vacated && (
          <div style={{ marginTop: 14, background: C.panel2, border: `1px solid ${C.accent2}`, borderRadius: 6, padding: 10, fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>
            ⚑ This program has NCAA-vacated results in its history. Scores reflect the <b style={{ color: C.text }}>{onField ? "on-field (vacated counted)" : "official (vacated removed)"}</b> setting — toggle in the Filters rail.
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 9.5, color: C.dim, lineHeight: 1.5 }}>
          Scores are relative composites on the selected era window & weights. Soft families (recruiting/poll/advanced/pro) are calibrated estimates, not exact records.
        </div>
      </div>
    </div>
  );
}
function Stat({ C, l, v, big, raw }) {
  return (
    <div>
      <div style={{ color: C.dim, fontSize: 10 }}>{l}</div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 800, color: big ? C.accent : C.text }}>{v == null ? "—" : raw ? v : Math.round(v)}</div>
    </div>
  );
}

// ----- METHOD PANEL -----
function MethodPanel({ C, close }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.accent2}`, borderRadius: 8, padding: 16, marginBottom: 14, fontSize: 11.5, lineHeight: 1.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: C.accent2, fontWeight: 800, fontSize: 13 }}>METHODOLOGY & SOURCES</span>
        <button className="btn" onClick={close}>✕</button>
      </div>
      <p style={{ marginTop: 0 }}><b style={{ color: C.text }}>Structure.</b> Each program carries era-bucketed scores (1976–89 / 1990–99 / 2000–09 / 2010–25) for six metric families, per sport, on a relative 0–100 scale (100 = best-in-class over the window). Selecting eras and recency weighting re-aggregates live; metric-weight sliders recompute composites live.</p>
      <p><b style={{ color: C.text }}>Composite.</b> Weighted mean of the six families (default Champ 30 / Win% 20 / Pro 15 / Recruit 10 / Poll 15 / Adv 10). Combined = mean of CFB & CBB plus a two-sport balance bonus (up to +6) rewarding schools strong in <i>both</i>. Single-sport programs take a small 0.92 factor so they don't dominate the combined board on one leg.</p>
      <p><b style={{ color: C.text }}>Tiers.</b> Blue Blood ≥82 · Elite ≥70 · Power ≥58 · Solid ≥45 · Rising &lt;45, assigned from the active composite.</p>
      <p style={{ color: C.accent2 }}><b>Data confidence — read this.</b></p>
      <ul style={{ margin: "4px 0", paddingLeft: 18, color: C.dim }}>
        <li><b style={{ color: C.text }}>High confidence:</b> national titles, Final Fours, conference era/affiliation, vacated-result flags (Michigan, USC, Penn State, Miami, Memphis, Louisville, UConn-era cases).</li>
        <li><b style={{ color: C.accent2 }}>Calibrated analyst estimates:</b> recruiting, poll-weeks, advanced metrics, pro-production counts, and era-split win% are <b>relative approximations</b>, not exact sourced season figures. They encode well-known program reputations into a comparable scale but should not be cited as official records.</li>
        <li><b style={{ color: C.text }}>Nulls:</b> programs with negligible top-division presence in an era store null and are excluded from that era's aggregation (e.g. Gonzaga pre-1990 CBB, most mid-major CFB).</li>
      </ul>
      <p style={{ color: C.dim }}>For exact figures, the intended source stack is Sports-Reference (CFB-Ref / Bball-Ref), NCAA record books, KenPom (post-2002 CBB efficiency), and SRS/SP+. This self-contained build uses curated aggregates so it runs with no external calls.</p>
    </div>
  );
}
