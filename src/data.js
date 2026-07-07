// ============================================================================
// DATA & METHODOLOGY
// HARD DATA (high confidence): national titles, Final Fours, conference era,
//   and the season-by-season champions ledger (CHAMPIONS, below).
// CALIBRATED ESTIMATES (flagged): recruiting, poll-weeks, advanced, pro counts,
//   and era-split win%. These are analyst approximations on a 0-100 relative
//   scale, NOT exact sourced season figures. Do not cite as official records.
// Era buckets: E1 1976-89, E2 1990-99, E3 2000-09, E4 2010-25.
// Each metric per sport is stored as a 4-length era array [E1,E2,E3,E4] on a
// 0-100 relative scale (100 = best-in-class for that family over the window).
// ============================================================================

export const ERAS = [
  { key: "E1", label: "1976–89", years: 14 },
  { key: "E2", label: "1990–99", years: 10 },
  { key: "E3", label: "2000–09", years: 10 },
  { key: "E4", label: "2010–25", years: 16 },
];

export const FAMILIES = [
  { key: "champ", label: "Championships", short: "Champ" },
  { key: "winpct", label: "Win %", short: "Win%" },
  { key: "pro", label: "Pro Production", short: "Pro" },
  { key: "recruit", label: "Recruiting", short: "Recr" },
  { key: "poll", label: "Poll Presence", short: "Poll" },
  { key: "adv", label: "Advanced", short: "Adv" },
];

export const DEFAULT_WEIGHTS = { champ: 30, winpct: 20, pro: 15, recruit: 10, poll: 15, adv: 10 };

// Families reduced (removed) for vacated programs when the board is in OFFICIAL
// mode (vacated titles/wins struck from the record). Toggling to ON-FIELD
// restores them. Only credibility-of-record families are affected.
export const VACATED_OFFICIAL_FACTOR = { champ: 0.86, winpct: 0.93, poll: 0.95 };

const P = (champ, winpct, pro, recruit, poll, adv) => ({ champ, winpct, pro, recruit, poll, adv });

// ---------------------------------------------------------------------------
// RAW FIGURES (audit/tooltip layer). sport -> family -> short human string.
// Illustrative summaries from well-known program totals, not full records.
// ---------------------------------------------------------------------------
export const RAW = {
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
export const rawFor = (name, sport) => (RAW[name] && RAW[name][sport]) || null;

export const PROGRAMS = [
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

  // ===== CBB-LEANING POWERS =====
  { name: "Duke", conf: "ACC", cfb: P([18,22,30,40],[20,24,32,42],[24,28,38,48],[null,30,42,55],[16,22,32,44],[20,26,38,50]),
    cbb: P([72,98,96,94],[95,98,94,90],[90,96,96,92],[null,98,98,96],[90,98,96,92],[90,96,96,92]) },
  { name: "North Carolina", conf: "ACC", cfb: P([35,40,48,52],[38,42,50,54],[42,46,54,58],[null,48,58,64],[34,40,48,54],[38,44,52,58]),
    cbb: P([88,90,92,90],[92,94,90,86],[88,90,94,88],[null,92,94,90],[90,92,92,88],[88,90,92,88]) },
  { name: "Kentucky", conf: "SEC", cfb: P([28,32,42,58],[30,34,44,62],[34,40,50,68],[null,42,56,72],[26,32,42,60],[30,36,48,64]),
    cbb: P([90,92,90,96],[94,92,86,92],[90,92,94,90],[null,94,96,98],[92,92,90,94],[90,90,92,92]) },
  { name: "Kansas", conf: "Big 12", cfb: P([22,28,55,42],[25,30,58,45],[28,34,62,50],[null,36,64,56],[20,28,56,44],[24,32,60,50]),
    cbb: P([82,88,92,96],[90,92,94,94],[86,90,96,94],[null,92,96,96],[88,90,94,96],[86,90,94,96]) },
  // CFB E4 lifted to reflect the Cignetti surge: 2024 CFP berth + a 16-0 2025
  // national title (def. Miami 27–21). Era avg still modest — Indiana was weak
  // for most of 2010–24 — but no longer bottom-tier, matching its champion status.
  { name: "Indiana", conf: "Big Ten", cfb: P([22,28,32,64],[25,30,34,60],[28,32,38,58],[null,34,44,62],[20,28,32,62],[24,30,38,64]),
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

export const ACTIVE = PROGRAMS.filter((p) => !p.hide);
export const CONFS = ["All", ...Array.from(new Set(ACTIVE.map((p) => p.conf))).sort()];

// ---------------------------------------------------------------------------
// SEASON CHAMPIONS LEDGER  (HARD DATA)
// ---------------------------------------------------------------------------
// A season-by-season national-champion record. THIS is the forward-looking
// surface: as each new title is decided, append one row here — nothing else in
// the app needs to change. `cfb` is keyed by the season year (title game the
// following January); `cbb` by the season's spring championship year.
// `null`      → champion not yet official; UI renders an "awaiting result" row.
// `CANCELLED` → season played no championship (e.g. COVID); UI renders "not held".
//
//   TO ADD A FUTURE SEASON: add/replace a row below with the champion's name.
//   Names should match a program in PROGRAMS to get a clickable cross-link.
//
// Ledger verified July 2026 against NCAA.com, ESPN, and CFP.com:
//   · 2025 CFB — Indiana def. Miami (FL) 27–21 (Jan 19, 2026), first-ever title.
//   · 2026 CBB — Michigan def. UConn 69–63 (Apr 6, 2026), first title since 1989.
//   · 2020 CBB — no champion; the 2019–20 NCAA tournament was cancelled (COVID-19).
// ---------------------------------------------------------------------------
export const CANCELLED = "__cancelled__"; // season with no championship held

export const CHAMPIONS = [
  { year: 2026, cfb: null,             cbb: "Michigan" },        // CFP title game Jan 2027 pending · Michigan won Apr 2026
  { year: 2025, cfb: "Indiana",        cbb: "Florida" },         // Indiana def. Miami 27–21 (Jan 2026) · Florida won Apr 2025
  { year: 2024, cfb: "Ohio State",     cbb: "Connecticut" },     // Ohio State CFP champ (Jan 2025) · UConn back-to-back
  { year: 2023, cfb: "Michigan",       cbb: "Connecticut" },
  { year: 2022, cfb: "Georgia",        cbb: "Kansas" },
  { year: 2021, cfb: "Georgia",        cbb: "Baylor" },
  { year: 2020, cfb: "Alabama",        cbb: CANCELLED },         // 2019–20 NCAA tourney cancelled (COVID-19)
  { year: 2019, cfb: "LSU",            cbb: "Virginia" },
  { year: 2018, cfb: "Clemson",        cbb: "Villanova" },
  { year: 2017, cfb: "Alabama",        cbb: "North Carolina" },
  { year: 2016, cfb: "Clemson",        cbb: "Villanova" },
  { year: 2015, cfb: "Alabama",        cbb: "Duke" },
  { year: 2014, cfb: "Ohio State",     cbb: "Connecticut" },
  { year: 2013, cfb: "Florida State",  cbb: "Louisville" },      // Louisville's 2013 title later vacated
];
