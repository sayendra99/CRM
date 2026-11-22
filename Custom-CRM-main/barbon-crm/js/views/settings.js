import { html, useState } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Toggle, Field, SectionCard, StatusDot } from '../components/ui.js';
import { toast } from '../components/toast.js';
import {
  useStore, updateSettings, addGroup, updateGroup, deleteGroup,
  exportState, replaceState, resetAll, importProspects, noteBackup,
  hasSafetySnapshot, restoreSafetySnapshot,
  addCustomField, removeCustomField,
  addProspectType, removeProspectType, addLeadSource, removeLeadSource,
  moveGroup,
  switchWorkspace, addWorkspace, updateWorkspace, deleteWorkspace,
} from '../store.js';
import { download, csvEscape, daysBetween, todayISO } from '../util.js';
import { requestNotifications } from '../notify.js';
import { PALETTES } from '../palettes.js';

const THEMES = [
  { value: 'light', icon: 'sun', label: 'Light' },
  { value: 'dark', icon: 'moon', label: 'Dark' },
  { value: 'system', icon: 'monitor', label: 'System' },
];
const COLORS = ['violet', 'green', 'blue', 'amber', 'rose', 'teal', 'slate'];

function parseCSV(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; } if (c === '\r' && text[i + 1] === '\n') i++; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function ColorDots({ value, onPick }) {
  return html`<div class="row-flex">${COLORS.map((c) => html`<button title=${c} onClick=${() => onPick(c)} style=${`width:18px;height:18px;border-radius:50%;border:2px solid ${value === c ? 'var(--text)' : 'transparent'};background:rgb(var(--pc-${c}));cursor:pointer`}></button>`)}</div>`;
}

function CsvImport({ groups, serviceTypes }) {
  const [result, setResult] = useState(null);
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text).filter((r) => r.some((c) => c.trim()));
    if (rows.length < 1) { toast('Empty file', 'x'); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (names) => header.findIndex((h) => names.includes(h));
    const iName = idx(['name']); const iHandle = idx(['handle', 'instagram @ handle', 'instagram', 'instagram handle']);
    const iService = idx(['service', 'type of service']); const iNotes = idx(['notes']);
    const parsed = rows.slice(1).map((r) => ({
      name: iName >= 0 ? r[iName] : '', handle: iHandle >= 0 ? r[iHandle] : '',
      service: iService >= 0 && serviceTypes.includes((r[iService] || '').trim()) ? r[iService].trim() : '',
      notes: iNotes >= 0 ? r[iNotes] : '', groupId: groups[0] && groups[0].id,
    })).filter((p) => p.name || p.handle);
    const res = importProspects(parsed);
    setResult(res);
    toast(`Imported ${res.added}, skipped ${res.duplicates} duplicates`);
    e.target.value = '';
  };
  const handlePaste = () => {
    const text = prompt('Paste one prospect per line — "name, handle" or just a handle:');
    if (!text) return;
    const parsed = text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[,\t]/).map((x) => x.trim());
      return parts.length > 1 ? { name: parts[0], handle: parts[1], groupId: groups[0] && groups[0].id } : { name: '', handle: parts[0], groupId: groups[0] && groups[0].id };
    });
    const res = importProspects(parsed);
    setResult(res);
    toast(`Imported ${res.added}, skipped ${res.duplicates} duplicates`);
  };
  return html`<div>
    <p class="muted mb-16" style="font-size:13px">Import into the current workspace. Rows whose Instagram handle already exists are skipped automatically.</p>
    <div class="wrap-flex">
      <label class="btn"><${Icon} name="plus" size=15 /> CSV file<input type="file" accept=".csv,text/csv" style="display:none" onChange=${handleFile} /></label>
      <${Button} icon="copy" onClick=${handlePaste}>Paste a list<//>
    </div>
    ${result && html`<div class="mt-16"><${Pill} color="green">${result.added} added<//> <${Pill} color="amber">${result.duplicates} duplicates skipped<//></div>`}
  </div>`;
}

export function SettingsView() {
  const state = useStore();
  const s = state.settings;
  const [newGroup, setNewGroup] = useState('');
  const [newField, setNewField] = useState('');
  const [newType, setNewType] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newGroupTag, setNewGroupTag] = useState('');
  const active = state.workspaces.find((w) => w.id === state.activeWs) || state.workspaces[0];
  const addGroupTag = () => { const v = newGroupTag.trim(); if (!v) return; updateWorkspace(active.id, { suggestedTags: [...new Set([...(active.suggestedTags || []), v])] }); setNewGroupTag(''); toast('Group added'); };

  const doExportJSON = () => { download('barbon-crm-backup.json', exportState()); noteBackup(); toast('Backup downloaded'); };
  const doExportCSV = () => {
    const gname = (id) => (state.groups.find((g) => g.id === id) || {}).name || '';
    const lines = [['name', 'handle', 'service', 'group', 'stage', 'reply', 'nextDue', 'tags', 'email', 'phone', 'propertyNotes', 'notes'].join(',')];
    state.prospects.forEach((p) => lines.push([p.name, p.handle, p.service, gname(p.groupId), p.stage, p.replyStatus, p.followUpDate || '', (p.tags || []).join('; '), p.email || '', p.phone || '', p.propertyNotes || '', p.notes].map(csvEscape).join(',')));
    download('barbon-crm-prospects.csv', lines.join('\n'), 'text/csv');
    noteBackup(); toast('CSV exported');
  };
  const restore = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()); if (confirm('Restore this backup? It replaces ALL data across all workspaces.')) { replaceState(data); toast('Backup restored'); } }
    catch (err) { toast('Invalid backup file', 'x'); }
    e.target.value = '';
  };
  const toggleNotifications = async (v) => {
    if (v) { const ok = await requestNotifications(); updateSettings({ notifications: ok }); toast(ok ? 'Notifications on' : 'Permission denied', ok ? 'check' : 'x'); }
    else updateSettings({ notifications: false });
  };

  const backupStale = !s.lastBackup || daysBetween(s.lastBackup, todayISO()) >= 7;
  const totalProspects = state.workspaces.reduce((n, w) => n + w.prospects.length, 0);

  return html`<div class="main">
    <div class="topbar"><h1><span class="page-emoji">⚙️</span> Settings</h1></div>
    <div class="view"><div class="view-inner" style="max-width:760px">

      <!-- Workspaces -->
      <${SectionCard} title="Workspaces (outreach clients)" className="mb-16"
        right=${html`<${Button} size="sm" icon="plus" onClick=${() => { const n = prompt('Name the new workspace:'); if (n && n.trim()) { addWorkspace({ name: n.trim() }); toast('Workspace created'); } }}>New<//>`}>
        <p class="muted mb-16" style="font-size:13px">Each workspace is a fully separate pipeline — its own prospects, groups, services, templates and KPIs. Switch from here or the top-left.</p>
        ${state.workspaces.map((w) => html`<div class="check-line" key=${w.id}>
          <div class="brand-logo" style=${`width:26px;height:26px;font-size:12px;background:rgb(var(--pc-${w.color || 'violet'}))`}>${(w.name || 'W')[0].toUpperCase()}</div>
          <input class="input" style="flex:1;max-width:220px" value=${w.name} onChange=${(e) => updateWorkspace(w.id, { name: e.target.value })} />
          <${ColorDots} value=${w.color} onPick=${(c) => updateWorkspace(w.id, { color: c })} />
          <span class="muted" style="font-size:12px">${w.prospects.length}</span>
          <div class="spacer"></div>
          ${w.id === state.activeWs ? html`<${Pill} color="green">Active<//>` : html`<${Button} size="sm" variant="ghost" onClick=${() => switchWorkspace(w.id)}>Switch<//>`}
          ${state.workspaces.length > 1 && html`<${IconButton} name="trash" title="Delete workspace" onClick=${() => { if (confirm(`Delete workspace “${w.name}” and all ${w.prospects.length} of its prospects? This cannot be undone.`)) { deleteWorkspace(w.id); toast('Workspace deleted'); } }} />`}
        </div>`)}
      <//>

      <${SectionCard} title="Appearance" className="mb-16">
        <${Field} label="Theme">
          <div class="wrap-flex">
            ${THEMES.map((t) => html`<button class=${'svc-tab ' + (s.theme === t.value ? 'active' : '')} onClick=${() => updateSettings({ theme: t.value })}>
              <${Icon} name=${t.icon} size=15 style="display:inline;vertical-align:-3px" /> ${t.label}</button>`)}
          </div>
        <//>
        <${Field} label="Your name" hint="Used for the dashboard greeting">
          <input class="input" value=${s.operatorName} onInput=${(e) => updateSettings({ operatorName: e.target.value })} placeholder="e.g. Josh" />
        <//>
        <div class="check-line"><div style="flex:1"><b>Glass background</b><div class="muted" style="font-size:13px">Show the palette as a bold gradient behind frosted-glass panels. Off by default.</div></div>
          <${Toggle} checked=${!!s.glassMode} onChange=${(v) => { updateSettings({ glassMode: v }); toast(v ? 'Glass on' : 'Glass off'); }} /></div>
        <${Field} label=${html`Palette <span class="muted" style="font-weight:400">· ${active.name}</span>`}
          hint="Recolours this workspace over your light/dark mode. Each workspace keeps its own — it switches automatically when you change workspace.">
          <div class="palette-grid">
            ${PALETTES.map((pl) => html`<button class=${'palette-swatch ' + (active.palette === pl.id ? 'on' : '')}
              title=${pl.name} onClick=${() => { updateWorkspace(active.id, { palette: pl.id }); toast(pl.name); }} key=${pl.id}>
              <span class="palette-chip" style=${`background:linear-gradient(135deg, ${pl.a}, ${pl.b})`}></span>
              <span class="palette-name">${pl.name}</span>
            </button>`)}
          </div>
        <//>
      <//>

      <${SectionCard} title="Outreach guardrails" className="mb-16">
        <div class="check-line"><div style="flex:1"><b>Browser notifications</b><div class="muted" style="font-size:13px">Alert me about due follow-ups even when I'm not in the app (best when installed to home screen).</div></div>
          <${Toggle} checked=${s.notifications} onChange=${toggleNotifications} /></div>
        <div class="check-line"><div style="flex:1"><b>Skip weekends</b><div class="muted" style="font-size:13px">Push follow-ups that land on a weekend to Monday.</div></div>
          <${Toggle} checked=${s.workdaysOnly} onChange=${(v) => updateSettings({ workdaysOnly: v })} /></div>
        <div class="check-line"><div style="flex:1"><b>Randomise follow-up timing</b><div class="muted" style="font-size:13px">Vary each due date by ±1 day so cadence never looks automated.</div></div>
          <${Toggle} checked=${s.jitter} onChange=${(v) => updateSettings({ jitter: v })} /></div>
        <${Field} label="Daily send cap" hint="Warns you when you exceed this many sends in a day.">
          <input class="input" type="number" min="0" style="width:120px" value=${s.dailyDmCap} onInput=${(e) => updateSettings({ dailyDmCap: Number(e.target.value) })} />
        <//>
      <//>

      <${SectionCard} title=${html`Pipeline Stages <span class="muted" style="font-weight:400;font-size:12px">· ${active.name}</span>`} className="mb-16">
        <p class="muted mb-16" style="font-size:13px">The stages of your sales process for this workspace — where each prospect currently sits. Prospects move between stages manually or via automations.</p>
        ${state.groups.map((g, i) => html`<div class="check-line" key=${g.id}>
          <div class="row-flex" style="gap:2px">
            <${IconButton} name="chevronUp" size=15 title="Move up" onClick=${() => moveGroup(g.id, -1)} className=${i === 0 ? 'disabled' : ''} />
            <${IconButton} name="chevronDown" size=15 title="Move down" onClick=${() => moveGroup(g.id, 1)} className=${i === state.groups.length - 1 ? 'disabled' : ''} />
          </div>
          <span class="group-bar" style=${`--pc:var(--pc-${g.color})`}></span>
          <input class="input" style="flex:1;max-width:200px" value=${g.name} onChange=${(e) => updateGroup(g.id, { name: e.target.value })} />
          <${ColorDots} value=${g.color} onPick=${(c) => updateGroup(g.id, { color: c })} />
          <div class="spacer"></div>
          <${IconButton} name="trash" title="Delete stage" onClick=${() => { if (confirm('Delete stage? Prospects move to another stage.')) deleteGroup(g.id); }} />
        </div>`)}
        <div class="wrap-flex mt-16">
          <input class="input" style="max-width:220px" value=${newGroup} onInput=${(e) => setNewGroup(e.target.value)} placeholder="New stage name" />
          <${Button} icon="plus" onClick=${() => { if (newGroup.trim()) { addGroup(newGroup.trim()); setNewGroup(''); toast('Stage added'); } }}>Add stage<//>
        </div>
      <//>

      <div class="grid grid-2 mb-16">
        <${SectionCard} title="Prospect Types">
          <p class="muted mb-16" style="font-size:13px">What a prospect <b>is</b>. Shared across all workspaces.</p>
          <div class="wrap-flex" style="gap:6px">
            ${(s.prospectTypes || []).map((t) => html`<span class="pill pill-soft pill-slate" key=${t}>${t}
              <button class="tag-x" title="Remove" onClick=${() => removeProspectType(t)}>×</button></span>`)}
          </div>
          <div class="wrap-flex mt-16">
            <input class="input" style="max-width:200px" value=${newType} onInput=${(e) => setNewType(e.target.value)} placeholder="New prospect type" onKeyDown=${(e) => { if (e.key === 'Enter' && newType.trim()) { addProspectType(newType.trim()); setNewType(''); } }} />
            <${Button} icon="plus" onClick=${() => { if (newType.trim()) { addProspectType(newType.trim()); setNewType(''); toast('Type added'); } }}>Add<//>
          </div>
        <//>
        <${SectionCard} title="Lead Sources">
          <p class="muted mb-16" style="font-size:13px">Where a prospect <b>came from</b>. Shared across all workspaces.</p>
          <div class="wrap-flex" style="gap:6px">
            ${(s.leadSources || []).map((t) => html`<span class="pill pill-soft pill-blue" key=${t}>${t}
              <button class="tag-x" title="Remove" onClick=${() => removeLeadSource(t)}>×</button></span>`)}
          </div>
          <div class="wrap-flex mt-16">
            <input class="input" style="max-width:200px" value=${newSource} onInput=${(e) => setNewSource(e.target.value)} placeholder="New lead source" onKeyDown=${(e) => { if (e.key === 'Enter' && newSource.trim()) { addLeadSource(newSource.trim()); setNewSource(''); } }} />
            <${Button} icon="plus" onClick=${() => { if (newSource.trim()) { addLeadSource(newSource.trim()); setNewSource(''); toast('Source added'); } }}>Add<//>
          </div>
        <//>
      </div>

      <${SectionCard} title=${html`Groups <span class="muted" style="font-weight:400;font-size:12px">· ${active.name}</span>`} className="mb-16">
        <p class="muted mb-16" style="font-size:13px">Flexible many-to-many buckets for organising prospects (e.g. "High Value", "Q4 Outreach"). A prospect can be in several at once. These are suggested when you tag prospects; add ones you use often.</p>
        <div class="wrap-flex" style="gap:6px">
          ${(active.suggestedTags || []).map((t) => html`<span class="pill pill-soft pill-violet" key=${t}>${t}
            <button class="tag-x" title="Remove from suggestions" onClick=${() => updateWorkspace(active.id, { suggestedTags: (active.suggestedTags || []).filter((x) => x !== t) })}>×</button></span>`)}
          ${(active.suggestedTags || []).length === 0 && html`<span class="muted" style="font-size:13px">No saved groups yet — add prospects to groups from their cards.</span>`}
        </div>
        <div class="wrap-flex mt-16">
          <input class="input" style="max-width:220px" value=${newGroupTag} onInput=${(e) => setNewGroupTag(e.target.value)} placeholder="New group name"
            onKeyDown=${(e) => { if (e.key === 'Enter') addGroupTag(); }} />
          <${Button} icon="plus" onClick=${addGroupTag}>Add group<//>
        </div>
      <//>

      <${SectionCard} title="Custom fields" className="mb-16">
        <p class="muted mb-16" style="font-size:13px">Add your own fields (e.g. “Referred by”, “Budget”). They appear on every prospect's detail view.</p>
        ${(s.customFields || []).length === 0 && html`<p class="muted" style="font-size:13px">No custom fields yet.</p>`}
        ${(s.customFields || []).map((cf) => html`<div class="check-line" key=${cf.id}>
          <${Icon} name="grid" size=15 /> <span style="flex:1">${cf.label}</span>
          <${IconButton} name="trash" title="Remove" onClick=${() => { if (confirm('Remove field “' + cf.label + '”? Values stay on prospects but are hidden.')) removeCustomField(cf.id); }} />
        </div>`)}
        <div class="wrap-flex mt-16">
          <input class="input" style="max-width:220px" value=${newField} onInput=${(e) => setNewField(e.target.value)} placeholder="New field name" />
          <${Button} icon="plus" onClick=${() => { if (newField.trim()) { addCustomField(newField.trim()); setNewField(''); toast('Field added'); } }}>Add field<//>
        </div>
      <//>

      <${SectionCard} title="Import prospects" className="mb-16">
        <${CsvImport} groups=${state.groups} serviceTypes=${state.settings.prospectTypes || []} />
      <//>

      <${SectionCard} title="Data & backup" className="mb-16">
        <div class="kv"><span class="k">Storage</span><span><${StatusDot} color="green" /> This device · ${totalProspects} prospects across ${state.workspaces.length} workspaces</span></div>
        <div class="kv"><span class="k">Last backup</span><span>${s.lastBackup ? s.lastBackup : 'never'} ${backupStale ? html`<${Pill} color="amber">back up soon<//>` : html`<${Pill} color="green">up to date<//>`}</span></div>
        <p class="muted" style="font-size:13px;margin:6px 0 14px">Your data lives in this browser. Export a backup regularly and keep it somewhere safe (a backup exports every workspace).</p>
        <div class="wrap-flex">
          <${Button} icon="external" onClick=${doExportJSON}>Export backup (JSON)<//>
          <${Button} icon="external" onClick=${doExportCSV}>Export this workspace (CSV)<//>
          <label class="btn"><${Icon} name="undo" size=15 /> Restore backup<input type="file" accept=".json" style="display:none" onChange=${restore} /></label>
        </div>
        ${hasSafetySnapshot() && html`<div class="mt-16"><${Button} size="sm" icon="undo" onClick=${() => { if (restoreSafetySnapshot()) toast('Restored pre-reset snapshot'); }}>Undo last reset (restore snapshot)<//></div>`}
        <div class="mt-16" style="border-top:1px solid var(--border);padding-top:14px">
          <${Button} variant="danger" icon="trash" onClick=${() => { if (confirm('Reset EVERYTHING (all workspaces) back to the starting data? A one-time undo snapshot is kept.')) { resetAll(); toast('Reset — undo available below'); } }}>Reset all data<//>
        </div>
      <//>

      <p class="muted" style="text-align:center;font-size:12px">Barbon Media Group CRM · built for honourable, consistent outreach</p>
    </div></div>
  </div>`;
}
