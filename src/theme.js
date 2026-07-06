// Two fully-designed themes (dark default + light), delivered as token maps so
// components style through tokens rather than raw hex. Neutrals carry a slight
// blue bias to feel chosen; the accent is amber, kept off the semantic tier
// hues. Contrast pairs target WCAG AA for text.
export const THEMES = {
  dark: {
    bg: "#0a0f1c",        // deep navy-slate ground
    panel: "#111a2e",
    panel2: "#18233c",
    border: "#26324d",
    text: "#eef2f9",      // ~13:1 on bg
    dim: "#93a3bd",       // ~5.2:1 on bg — lifted from the old #64748b
    faint: "#6b7a97",
    primary: "#5b9bff",   // blue data hue
    accent: "#f5b301",    // amber highlight
    accentText: "#0a0f1c",
    grid: "#1d2740",
    cellText: "#f3f6fc",
    cellTextDark: "#0a0f1c",
    shadow: "0 10px 30px -12px rgba(0,0,0,0.7)",
  },
  light: {
    bg: "#f4f7fc",
    panel: "#ffffff",
    panel2: "#eef3fb",
    border: "#d3ddec",
    text: "#0e1a2e",      // ~14:1 on bg
    dim: "#4a5a73",       // ~7:1 on panel
    faint: "#6c7c95",
    primary: "#1e5fd8",
    accent: "#b06f00",    // darker amber for AA on white
    accentText: "#ffffff",
    grid: "#dde5f1",
    cellText: "#0e1a2e",
    cellTextDark: "#0e1a2e",
    shadow: "0 8px 24px -14px rgba(20,40,80,0.35)",
  },
};

export const FONT_UI = "'Fira Sans','Segoe UI',system-ui,-apple-system,sans-serif";
export const FONT_MONO = "'Fira Code','SF Mono','Roboto Mono',Menlo,Consolas,monospace";
