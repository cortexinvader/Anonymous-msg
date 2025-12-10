export const THEMES = {
  0: { id: 0, name: "Txtme Original", bg: "#1a1a1a", card: "#2d2d2d", text: "#fff", accent: "#8A2BE2" },
  1: { id: 1, name: "Midnight Blue",  bg: "#000000", card: "#111b21", text: "#e9edef", accent: "#00a884" },
  2: { id: 2, name: "Sunset",         bg: "#41295a", card: "#2F0743", text: "#fff", accent: "#ff007f" },
  3: { id: 3, name: "Cyberpunk",      bg: "#000",    card: "#222",    text: "#0f0", accent: "#0f0", border: "1px solid #0f0" },
  4: { id: 4, name: "Cotton Candy",   bg: "#ffc3a0", card: "#ffffff", text: "#333", accent: "#ffafbd" },
};

export const AVATARS = [
  "👻", "👽", "🤖", "💀", "🔥", "❤️", "⭐", "🌈",
  "🐱", "🐶", "🦊", "🐼", "🦄", "😈", "👼"
];

// Pure SVG logo
export const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"> <defs> <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"> <stop offset="0%" stop-color="#8A2BE2"/> <stop offset="100%" stop-color="#00ffcc"/> </linearGradient> </defs> <rect width="512" height="512" rx="110" fill="url(#g)"/> <text x="256" y="335" font-family="Arial Black,Helvetica,sans-serif" font-size="200" fill="white" text-anchor="middle" font-weight="900">Txtme</text> <text x="380" y="400" font-size="160">👻</text> </svg>`;
