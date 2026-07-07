// Lightweight inline SVG icons (Lucide-style, 1.6px stroke) so the UI never
// relies on emoji/glyphs as structural icons. Every icon inherits currentColor.
import React from "react";

const Svg = ({ children, size = 16, fill = "none", ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);

export const IconLadder = (p) => (<Svg {...p}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></Svg>);
export const IconQuadrant = (p) => (<Svg {...p}><path d="M3 3v18h18"/><circle cx="9" cy="15" r="1.6"/><circle cx="15" cy="9" r="1.6"/><circle cx="17" cy="16" r="1.6"/></Svg>);
export const IconGrid = (p) => (<Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Svg>);
export const IconTrophy = (p) => (<Svg {...p}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/></Svg>);
export const IconInfo = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/></Svg>);
export const IconStar = ({ filled, ...p }) => (<Svg fill={filled ? "currentColor" : "none"} {...p}><polygon points="12 3 14.9 8.9 21.5 9.8 16.7 14.4 17.8 21 12 17.9 6.2 21 7.3 14.4 2.5 9.8 9.1 8.9 12 3"/></Svg>);
export const IconFlag = (p) => (<Svg {...p}><path d="M4 21V4"/><path d="M4 4h11l-1.5 3.5L15 11H4"/></Svg>);
export const IconClose = (p) => (<Svg {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Svg>);
export const IconReset = (p) => (<Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></Svg>);
export const IconSun = (p) => (<Svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Svg>);
export const IconMoon = (p) => (<Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></Svg>);
export const IconDownload = (p) => (<Svg {...p}><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></Svg>);
export const IconFootball = (p) => (<Svg {...p}><path d="M4 12c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8Z"/><path d="M9 9l6 6M15 9l-6 6"/></Svg>);
export const IconBasketball = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8"/></Svg>);
export const IconChevron = ({ dir = "down", ...p }) => (
  <Svg {...p} style={{ transform: dir === "up" ? "rotate(180deg)" : "none", ...(p.style || {}) }}>
    <polyline points="6 9 12 15 18 9"/>
  </Svg>
);
