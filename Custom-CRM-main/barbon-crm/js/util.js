// Small, dependency-free helpers shared across the app.

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// ---- Dates (all internal dates are ISO 'YYYY-MM-DD', local time) ----
export function todayISO() {
  return toISO(new Date());
}
export function toISO(d) {
  if (!d) return null;
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) {
  const d = parseISO(iso) || new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function daysBetween(a, b) {
  const da = parseISO(a), db = parseISO(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}
// Shift a date off weekends onto the next Monday.
export function nextWorkday(iso) {
  const d = parseISO(iso);
  if (!d) return iso;
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  return toISO(d);
}
export function fmtDate(iso) {
  const d = parseISO(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export function fmtRelative(iso) {
  if (!iso) return '';
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  return `in ${diff}d`;
}

export function firstName(name = '') {
  const n = String(name).trim().split(/\s+/)[0] || '';
  // Guard against company-style names — keep it as-is if it isn't a plain name.
  return n;
}

// Fill {name} / NAME tokens in a template with a prospect's first name.
export function fillTemplate(text, prospect) {
  const fn = firstName(prospect && prospect.name) || 'there';
  return String(text || '')
    .replace(/\{name\}/gi, fn)
    .replace(/\bNAME\b/g, fn);
}

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Deterministic-ish small jitter so follow-up dates don't all land identically.
export function jitterDays(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 3) - 1; // -1, 0, or +1
}

export function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
