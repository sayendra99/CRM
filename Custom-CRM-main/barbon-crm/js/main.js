import { html, render, useState, useEffect } from './dom.js';
import { Icon } from './components/icons.js';
import { Menu } from './components/ui.js';
import { useStore, switchWorkspace, addWorkspace, runTimeAutomations } from './store.js';
import { applyPalette } from './palettes.js';
import { toast } from './components/toast.js';
import { dueCount } from './logic.js';
import { ToastHost } from './components/toast.js';
import { SendModal } from './components/send-modal.js';
import { ProspectModal } from './components/prospect-modal.js';
import { ProspectDrawer } from './components/prospect-drawer.js';
import { DashboardView } from './views/dashboard.js';
import { PipelineView } from './views/pipeline.js';
import { TodayView } from './views/today.js';
import { MessagesView } from './views/messages.js';
import { KpisView } from './views/kpis.js';
import { ChecklistView } from './views/checklist.js';
import { AutomationsView } from './views/automations.js';
import { AnalyticsView } from './views/analytics.js';
import { SettingsView } from './views/settings.js';
import { initNotifications } from './notify.js';

const NAV = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard' },
  { id: 'today', label: 'Today', icon: 'today', badge: true },
  { id: 'pipeline', label: 'Pipeline', icon: 'table' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'messages', label: 'Messages', icon: 'message' },
  { id: 'kpis', label: 'KPIs', icon: 'target' },
  { id: 'checklist', label: 'Standard', icon: 'checklist' },
  { id: 'automations', label: 'Automations', icon: 'zap' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
const MOBILE_PRIMARY = ['dashboard', 'today', 'pipeline', 'messages'];

// ---- Theme engine ----
function applyTheme(theme) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', resolved === 'dark' ? '#0d0d10' : '#ffffff');
}

function QuickFind({ onClose, onOpen }) {
  const state = useStore();
  const [q, setQ] = useState('');
  const results = q.trim() ? state.prospects.filter((p) => (p.name + ' ' + p.handle).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  useEffect(() => { const f = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);
  return html`<div class="modal-overlay" style="align-items:flex-start;padding-top:12vh" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="modal" style="max-width:520px">
      <div class="search-box" style="border:none;border-bottom:1px solid var(--border);border-radius:0;padding:14px 16px">
        <${Icon} name="search" size=18 />
        <input autofocus placeholder="Jump to a prospect…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      </div>
      <div class="modal-body" style="padding:8px">
        ${results.map((p) => html`<div class="nav-item" onClick=${() => { onOpen(p.id); onClose(); }}>
          <${Icon} name="user" size=16 /> <span>${p.name}</span> <span class="muted" style="font-size:12px">@${p.handle}</span></div>`)}
        ${q && results.length === 0 && html`<div class="muted" style="padding:16px">No matches.</div>`}
        ${!q && html`<div class="muted" style="padding:16px;font-size:13px">Type a name or Instagram handle.</div>`}
      </div>
    </div>
  </div>`;
}

function WorkspaceSwitcher({ state, compact }) {
  const active = state.workspaces.find((w) => w.id === state.activeWs) || state.workspaces[0];
  const items = [
    ...state.workspaces.map((w) => ({ label: w.name, icon: w.id === active.id ? 'check' : 'grid', onClick: () => switchWorkspace(w.id) })),
    { label: 'New workspace…', icon: 'plus', onClick: () => { const n = prompt('Name the new outreach client / workspace:'); if (n && n.trim()) { addWorkspace({ name: n.trim() }); toast(`Workspace “${n.trim()}” created`); } } },
  ];
  const dot = html`<div class="brand-logo" style=${`background:rgb(var(--pc-${active.color || 'violet'}))`}>${(active.name || 'W')[0].toUpperCase()}</div>`;
  if (compact) {
    return html`<${Menu} align="left" trigger=${html`<button class="ws-chip">${dot}<span>${active.name}</span><${Icon} name="chevronDown" size=14 /></button>`} items=${items} />`;
  }
  return html`<${Menu} align="left" trigger=${html`<div class="brand ws-trigger">
      ${dot}
      <div style="flex:1;min-width:0">
        <div class="brand-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${active.name}</div>
        <div class="brand-sub">Switch workspace ▾</div>
      </div>
    </div>`} items=${items} />`;
}

function App() {
  const state = useStore();
  const [view, setView] = useState(location.hash.replace('#/', '') || 'dashboard');
  const [drawer, setDrawer] = useState(null);
  const [send, setSend] = useState(null);
  const [edit, setEdit] = useState(null); // id | 'new'
  const [mobileMore, setMobileMore] = useState(false);
  const [finder, setFinder] = useState(false);

  useEffect(() => { applyTheme(state.settings.theme); }, [state.settings.theme]);
  useEffect(() => { applyPalette(state.palette); }, [state.palette]);
  useEffect(() => { document.documentElement.setAttribute('data-glass', state.settings.glassMode ? 'on' : 'off'); }, [state.settings.glassMode]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => { if (state.settings.theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, [state.settings.theme]);
  useEffect(() => { initNotifications(); }, []);
  // Run time-based automations (e.g. "no reply after N days") on load + hourly.
  useEffect(() => {
    const run = () => runTimeAutomations();
    const t = setTimeout(run, 800);
    const iv = setInterval(run, 60 * 60 * 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);
  useEffect(() => {
    const onHash = () => setView(location.hash.replace('#/', '') || 'dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setFinder(true); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      if (e.key === '/') { e.preventDefault(); setFinder(true); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEdit('new'); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (v) => { setView(v); location.hash = '/' + v; setMobileMore(false); window.scrollTo(0, 0); };
  const openProspect = (id) => setDrawer(id);
  const openSend = (id) => setSend(id);
  const openEdit = (id) => setEdit(id);

  const due = dueCount(state);
  const viewProps = { onOpen: openProspect, onSend: openSend, onEdit: openEdit, onAdd: () => setEdit('new'), navigate };

  let content;
  switch (view) {
    case 'pipeline': content = html`<${PipelineView} ...${viewProps} />`; break;
    case 'today': content = html`<${TodayView} ...${viewProps} />`; break;
    case 'messages': content = html`<${MessagesView} />`; break;
    case 'kpis': content = html`<${KpisView} />`; break;
    case 'checklist': content = html`<${ChecklistView} />`; break;
    case 'insights': content = html`<${AnalyticsView} />`; break;
    case 'automations': content = html`<${AutomationsView} />`; break;
    case 'settings': content = html`<${SettingsView} />`; break;
    default: content = html`<${DashboardView} ...${viewProps} />`;
  }

  return html`<div class="app">
    <!-- Sidebar (desktop) -->
    <aside class="sidebar">
      <${WorkspaceSwitcher} state=${state} />
      <div class="side-search" onClick=${() => setFinder(true)}>
        <${Icon} name="search" size=15 /> <span>Jump to…</span> <kbd>⌘K</kbd>
      </div>
      <div class="nav-label">Workspace</div>
      ${NAV.map((n) => html`<button class=${'nav-item ' + (view === n.id ? 'active' : '')} onClick=${() => navigate(n.id)} key=${n.id}>
        <${Icon} name=${n.icon} size=17 /> <span>${n.label}</span>
        ${n.badge && due > 0 && html`<span class="nav-badge">${due}</span>`}
      </button>`)}
      <div class="side-spacer"></div>
      <div class="nav-item" style="cursor:default"><${Icon} name="heart" size=16 /> <span class="muted" style="font-size:12px">Serve well. Stay consistent.</span></div>
    </aside>

    <!-- Main -->
    <div class="main" style="grid-column:2">
      <div class="mobile-topbar">
        <${WorkspaceSwitcher} state=${state} compact=${true} />
        <div class="spacer" style="flex:1"></div>
        <button class="icon-btn" onClick=${() => setFinder(true)}><${Icon} name="search" size=18 /></button>
      </div>
      ${content}
    </div>

    <!-- Mobile bottom nav -->
    <nav class="mobile-nav">
      ${MOBILE_PRIMARY.map((id) => { const n = NAV.find((x) => x.id === id); return html`<button class=${view === id ? 'active' : ''} onClick=${() => navigate(id)} key=${id}>
        <div style="position:relative"><${Icon} name=${n.icon} size=20 />${n.badge && due > 0 && html`<span style="position:absolute;top:-4px;right:-8px;background:rgb(var(--accent));color:#fff;border-radius:9px;font-size:9px;padding:0 4px;font-weight:700">${due}</span>`}</div>
        ${n.label}</button>`; })}
      <button class=${['insights', 'kpis', 'checklist', 'automations', 'settings'].includes(view) ? 'active' : ''} onClick=${() => setMobileMore(true)}>
        <${Icon} name="menu" size=20 /> More</button>
    </nav>

    ${mobileMore && html`<div class="modal-overlay" style="align-items:flex-end" onClick=${(e) => e.target === e.currentTarget && setMobileMore(false)}>
      <div class="modal" style="max-width:100%;border-radius:16px 16px 0 0">
        <div class="modal-body">
          ${['insights', 'kpis', 'checklist', 'automations', 'settings'].map((id) => { const n = NAV.find((x) => x.id === id); return html`<button class="nav-item" onClick=${() => navigate(id)}><${Icon} name=${n.icon} size=18 /> ${n.label}</button>`; })}
        </div>
      </div>
    </div>`}

    ${drawer && html`<${ProspectDrawer} prospectId=${drawer} onClose=${() => setDrawer(null)} onSend=${openSend} onEdit=${openEdit} />`}
    ${send && html`<${SendModal} prospectId=${send} onClose=${() => setSend(null)} />`}
    ${edit && html`<${ProspectModal} prospectId=${edit === 'new' ? null : edit} onClose=${() => setEdit(null)} />`}
    ${finder && html`<${QuickFind} onClose=${() => setFinder(false)} onOpen=${openProspect} />`}
    <${ToastHost} />
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
