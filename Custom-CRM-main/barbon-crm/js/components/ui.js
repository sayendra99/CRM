import { html, useEffect, useState, useRef } from '../dom.js';
import { Icon } from './icons.js';

export function Button({ children, onClick, variant = 'default', size = 'md', icon, disabled, title, type = 'button', className = '' }) {
  const cls = `btn btn-${variant} btn-${size} ${className}`;
  return html`<button type=${type} class=${cls} onClick=${onClick} disabled=${disabled} title=${title}>
    ${icon && html`<${Icon} name=${icon} size=${size === 'sm' ? 15 : 16} />`}
    ${children != null && html`<span>${children}</span>`}
  </button>`;
}

export function IconButton({ name, onClick, title, size = 16, active, className = '' }) {
  return html`<button class=${'icon-btn ' + (active ? 'active ' : '') + className} onClick=${onClick} title=${title}>
    <${Icon} name=${name} size=${size} />
  </button>`;
}

// Colored tag pill (service types, stages, etc.)
export function Pill({ children, color = 'slate', soft = true, className = '' }) {
  return html`<span class=${`pill pill-${color} ${soft ? 'pill-soft' : ''} ${className}`}>${children}</span>`;
}

export function StatusDot({ color = 'slate', pulse }) {
  return html`<span class=${`dot dot-${color} ${pulse ? 'dot-pulse' : ''}`}></span>`;
}

export function Avatar({ name = '', handle = '', size = 26 }) {
  const src = (name || handle || '?').trim();
  const initials = src.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';
  const colors = ['violet', 'green', 'blue', 'amber', 'rose', 'slate', 'teal'];
  let h = 0; for (const c of src) h = (h * 31 + c.charCodeAt(0)) | 0;
  const color = colors[Math.abs(h) % colors.length];
  return html`<span class=${`avatar avatar-${color}`} style=${`width:${size}px;height:${size}px;font-size:${size * 0.4}px`}>${initials}</span>`;
}

export function ProgressBar({ pct = 0, color = 'violet', height = 8 }) {
  return html`<div class="progress" style=${`height:${height}px`}>
    <div class=${`progress-fill bg-${color}`} style=${`width:${Math.min(100, pct)}%`}></div>
  </div>`;
}

export function Toggle({ checked, onChange, disabled }) {
  return html`<button class=${'toggle ' + (checked ? 'on' : '')} disabled=${disabled}
    onClick=${() => !disabled && onChange(!checked)} role="switch" aria-checked=${String(!!checked)}>
    <span class="toggle-knob"></span>
  </button>`;
}

export function Field({ label, children, hint }) {
  return html`<label class="field">
    ${label && html`<span class="field-label">${label}</span>`}
    ${children}
    ${hint && html`<span class="field-hint">${hint}</span>`}
  </label>`;
}

export function Select({ value, onChange, options, placeholder }) {
  return html`<select class="input select" value=${value} onChange=${(e) => onChange(e.target.value)}>
    ${placeholder && html`<option value="">${placeholder}</option>`}
    ${options.map((o) => {
      const val = typeof o === 'string' ? o : o.value;
      const lab = typeof o === 'string' ? o : o.label;
      return html`<option value=${val} selected=${val === value}>${lab}</option>`;
    })}
  </select>`;
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, []);
  return html`<div class="modal-overlay" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class=${'modal ' + (wide ? 'modal-wide' : '')}>
      <div class="modal-head">
        <h3>${title}</h3>
        <${IconButton} name="x" onClick=${onClose} title="Close" />
      </div>
      <div class="modal-body">${children}</div>
      ${footer && html`<div class="modal-foot">${footer}</div>`}
    </div>
  </div>`;
}

export function EmptyState({ icon = 'grid', title, children }) {
  return html`<div class="empty">
    <div class="empty-icon"><${Icon} name=${icon} size=${28} /></div>
    <h4>${title}</h4>
    ${children && html`<p>${children}</p>`}
  </div>`;
}

export function SectionCard({ title, right, children, className = '' }) {
  return html`<section class=${'card ' + className}>
    ${(title || right) && html`<div class="card-head">
      <h3>${title}</h3>${right}
    </div>`}
    <div class="card-body">${children}</div>
  </section>`;
}

// Map service type -> a stable pill color.
export function serviceColor(service) {
  const map = {
    'Property Investor': 'violet', 'Architect': 'blue', 'Interior Designer': 'teal',
    'Estate Agent': 'green', 'Lettings / Property Management': 'amber',
    'SA Provider': 'rose', 'Property Developer': 'slate', 'Deal Sourcer': 'blue',
    'Property Entrepreneur': 'violet',
  };
  return map[service] || 'slate';
}

const TAG_COLORS = ['violet', 'green', 'blue', 'amber', 'rose', 'teal', 'slate'];
export function tagColor(tag) {
  let h = 0; for (const c of String(tag)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

// Editable tag chips + add-by-typing. onAdd(tag) / onRemove(tag).
export function TagEditor({ tags = [], onAdd, onRemove, suggestions = [] }) {
  const [val, setVal] = useState('');
  const commit = () => { const t = val.trim(); if (t) { onAdd(t); setVal(''); } };
  const avail = suggestions.filter((s) => !tags.includes(s) && s.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
  return html`<div class="tag-editor">
    <div class="wrap-flex" style="gap:6px">
      ${tags.map((t) => html`<span class=${`pill pill-soft pill-${tagColor(t)}`}>${t}
        <button class="tag-x" onClick=${() => onRemove(t)} title="Remove">×</button></span>`)}
      <input class="tag-input" value=${val} placeholder="+ tag"
        onInput=${(e) => setVal(e.target.value)}
        onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !val && tags.length) { onRemove(tags[tags.length - 1]); } }}
        onBlur=${commit} />
    </div>
    ${val && avail.length > 0 && html`<div class="wrap-flex" style="gap:5px;margin-top:6px">
      ${avail.map((s) => html`<button class="svc-tab" style="padding:3px 9px;font-size:11.5px" onMouseDown=${(e) => { e.preventDefault(); onAdd(s); setVal(''); }}>${s}</button>`)}
    </div>`}
  </div>`;
}

// Lightweight dropdown menu. trigger is rendered; items = [{label, icon, onClick, danger}].
export function Menu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return html`<div class="menu-wrap" ref=${ref}>
    <div onClick=${(e) => { e.stopPropagation(); setOpen(!open); }}>${trigger}</div>
    ${open && html`<div class=${'menu ' + (align === 'left' ? 'menu-left' : '')}>
      ${items.filter(Boolean).map((it) => html`<button class=${'menu-item ' + (it.danger ? 'danger' : '')} onClick=${(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}>
        ${it.icon && html`<${Icon} name=${it.icon} size=15 />`} <span>${it.label}</span></button>`)}
    </div>`}
  </div>`;
}
