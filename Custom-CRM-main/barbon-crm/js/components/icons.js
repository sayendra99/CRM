import { html } from '../dom.js';

// Minimal line-icon set (1.75 stroke, currentColor) in the Attio spirit.
const P = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm9 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  table: 'M4 6h16M4 12h16M4 18h16',
  today: 'M12 4v2m0 12v2m8-8h-2M6 12H4m13.5-5.5-1.4 1.4M7.9 16.1l-1.4 1.4m11.6 0-1.4-1.4M7.9 7.9 6.5 6.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  message: 'M4 5h16v10H9l-5 4V5Z',
  target: 'M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12h.01',
  check: 'M5 12l4 4L19 6',
  checklist: 'M4 6h2v2H4V6Zm0 5h2v2H4v-2Zm0 5h2v2H4v-2ZM9 7h11M9 12h11M9 17h11',
  zap: 'M13 3 4 14h7l-1 7 9-11h-7l1-7Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.3 7.3 0 0 0-2-1.2L16.5 3h-4l-.4 2.5a7.3 7.3 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7.4 7.4 0 0 0 5.6 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.5h4l.4-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4',
  plus: 'M12 5v14M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  filter: 'M4 5h16l-6 8v5l-4 2v-7L4 5Z',
  x: 'M6 6l12 12M18 6 6 18',
  copy: 'M9 9h10v10H9V9Zm-4 6H4V4h11v1',
  external: 'M14 4h6v6m0-6L10 14M18 13v6H5V6h6',
  instagram: 'M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm4.5-1.5h.01',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  monitor: 'M4 5h16v10H4V5Zm5 14h6m-3-4v4',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm3 9a3 3 0 0 0 6 0',
  archive: 'M4 7h16v3H4V7Zm1 3h14v10H5V10Zm4 3h6',
  trash: 'M5 7h14M9 7V4h6v3m-7 0 1 13h6l1-13',
  edit: 'M4 20h4L18 10l-4-4L4 16v4ZM14 6l4 4',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  quote: 'M7 7h4v4c0 3-2 5-4 5V7Zm7 0h4v4c0 3-2 5-4 5V7Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.5C8.5 10 9 11 9 12c0-3 3-4 3-9Z',
  undo: 'M9 7 5 11l4 4M5 11h9a5 5 0 0 1 0 10h-2',
  heart: 'M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5C19 15.5 12 20 12 20Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4Zm-9 9h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  chart: 'M4 20h16M7 20v-6M12 20V8M17 20v-9',
  funnel: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
};

export function Icon({ name, size = 18, stroke = 1.75, style = '', className = '' }) {
  const d = P[name] || P.grid;
  return html`<svg class=${'icon ' + className} style=${style} width=${size} height=${size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round">
    ${d.split('M').filter(Boolean).map((seg) => html`<path d=${'M' + seg} />`)}
  </svg>`;
}
