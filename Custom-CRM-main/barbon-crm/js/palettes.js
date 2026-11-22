// Gradient UI palettes. Each palette provides:
//   accent  -> "r,g,b" used for --accent (buttons, links, highlights). Chosen
//              dark/saturated enough to keep white button text legible.
//   a, b    -> the two gradient endpoints (hex) used for logo + hero gradients.
// Surfaces mix a few % of the accent at runtime (see app.css), so picking a
// palette gently tints the whole workspace in both light and dark modes.
export const PALETTES = [
  { id: 'violet', name: 'Violet (default)', accent: '91,87,235', a: '#7c6cff', b: '#5b57eb' },
  { id: 'muted-dusk', name: 'Muted dusk', accent: '198,95,150', a: '#d98ec9', b: '#e0955a' },
  { id: 'nightshade', name: 'Nightshade', accent: '176,54,104', a: '#e08ac0', b: '#3a1e08' },
  { id: 'fernway', name: 'Fernway', accent: '132,92,196', a: '#c979d6', b: '#4a7a4a' },
  { id: 'cloudlifter', name: 'Cloudlifter', accent: '99,127,196', a: '#a9c0dd', b: '#e0c3d8' },
  { id: 'grasshopper', name: 'Grasshopper', accent: '180,92,50', a: '#d9784a', b: '#35502a' },
  { id: 'inkblot', name: 'Inkblot', accent: '162,34,98', a: '#1f5a52', b: '#b5651d' },
  { id: 'gumdrop', name: 'Gumdrop', accent: '63,107,200', a: '#1f6fc0', b: '#d06ab0' },
  { id: 'almond-flour', name: 'Almond flour', accent: '128,114,164', a: '#c3c6da', b: '#edd3d0' },
  { id: 'strawberry-guava', name: 'Strawberry guava', accent: '196,86,128', a: '#d96a95', b: '#6f6a1e' },
  { id: 'nocturne', name: 'Nocturne', accent: '124,78,138', a: '#2a1f5e', b: '#6a5a10' },
];

const BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p]));
export function getPalette(id) { return BY_ID[id] || BY_ID.violet; }

// Sensible per-workspace defaults (changeable in Settings).
export function defaultPaletteFor(workspaceId) {
  if (workspaceId === 'ws_sa') return 'gumdrop';
  if (workspaceId === 'ws_barbon') return 'muted-dusk';
  return 'violet';
}

// Apply a palette to the document root — sets accent + gradient vars, so all
// palette-aware CSS (surfaces, logo, hero) updates instantly.
export function applyPalette(id) {
  const p = getPalette(id);
  const root = document.documentElement;
  root.style.setProperty('--accent', p.accent);
  root.style.setProperty('--grad-a', p.a);
  root.style.setProperty('--grad-b', p.b);
}
