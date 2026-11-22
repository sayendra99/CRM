import { html, useState, useMemo, useEffect } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Avatar, StatusDot, Menu, serviceColor, tagColor, EmptyState } from '../components/ui.js';
import { toast } from '../components/toast.js';
import {
  useStore, toggleGroup, markSent, snoozeProspect, updateProspect,
  bulkMove, bulkSetService, bulkArchive, bulkTag, bulkDelete,
} from '../store.js';
import { isDue, isOverdue, nextStageLabel, suggestVariant } from '../logic.js';
import { fmtDate, fmtRelative, fillTemplate } from '../util.js';

const NOT_SPECIFIED = 'Not specified';

function replyDot(p) {
  if (p.replyStatus === 'positive') return 'green';
  if (p.replyStatus === 'negative') return 'rose';
  if (isOverdue(p)) return 'rose';
  if (isDue(p)) return 'amber';
  return 'slate';
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
}
function byAdded(a, b) {
  const d = (a.createdAt || '').localeCompare(b.createdAt || '');
  if (d) return d;
  return (a.createdTs || 0) - (b.createdTs || 0);
}
function latestNote(p) {
  const notes = (p.history || []).filter((h) => h.type === 'note');
  if (notes.length) return notes[notes.length - 1].text;
  return p.propertyNotes || '';
}

// Inline-editable Property notes cell.
function NotesCell({ p }) {
  const [v, setV] = useState(p.propertyNotes || '');
  useEffect(() => { setV(p.propertyNotes || ''); }, [p.id, p.propertyNotes]);
  return html`<input class="notes-inline" value=${v} placeholder="Add property notes…"
    onClick=${(e) => e.stopPropagation()}
    onInput=${(e) => setV(e.target.value)}
    onBlur=${() => { if (v !== (p.propertyNotes || '')) updateProspect(p.id, { propertyNotes: v }); }} />`;
}

function Row({ p, state, selected, onSelect, onOpen, onSend, onQuick, onSnooze }) {
  const stageLabel = nextStageLabel(state, p);
  const due = p.stage > 0 && p.followUpDate;
  const overdue = isOverdue(p);
  const dueCls = overdue ? 'overdue' : (isDue(p) ? 'today' : 'upcoming');
  const groups = p.tags || [];
  const src = p.leadSource && p.leadSource !== NOT_SPECIFIED ? p.leadSource : '';
  return html`<div class=${'row ' + (selected ? 'selected' : '')}>
    <div class="cell cell-check">
      <span class=${`dot dot-${replyDot(p)} rowdot ${overdue ? 'dot-pulse' : ''}`}></span>
      <button class=${'rowcheck ' + (selected ? 'done' : '')} onClick=${(e) => { e.stopPropagation(); onSelect(p.id); }}><${Icon} name="check" size=12 /></button>
    </div>
    <div class="cell cell-name" onClick=${() => onOpen(p.id)}>
      <${Avatar} name=${p.name} handle=${p.handle} />
      <div style="min-width:0">
        <div class="nm">${p.name}</div>
        <div class="cell-mobile-meta due-meta">
          ${p.service && html`<span>${p.service}</span>`}
          ${due && html`<span class=${'due-tag ' + dueCls}>${fmtRelative(p.followUpDate)}</span>`}
        </div>
        <div class="hd" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${p.handle && html`<span>@${p.handle}</span>`}
          ${src && html`<span class="src-chip"><${Icon} name="arrowRight" size=10 /> ${src}</span>`}
          ${groups.slice(0, 3).map((t) => html`<span class=${`pill pill-soft pill-${tagColor(t)}`} style="font-size:10.5px;padding:0 6px">${t}</span>`)}
          ${groups.length > 3 && html`<span class="muted" style="font-size:11px">+${groups.length - 3}</span>`}
        </div>
      </div>
    </div>
    <div class="cell cell-service">${p.service && html`<${Pill} color=${serviceColor(p.service)}>${p.service}<//>`}</div>
    <div class="cell cell-notes"><${NotesCell} p=${p} /></div>
    <div class="cell cell-stage">
      <div class="stage-track" title=${p.stage + ' sent'}>
        ${state.messages.stageOrder.map((s, i) => html`<div class=${'stage-seg ' + (i < p.stage ? 'filled' : '')}></div>`)}
      </div>
    </div>
    <div class="cell cell-due-col">
      ${due ? html`<span class=${'due-tag ' + dueCls}><${Icon} name="clock" size=13 /> ${fmtDate(p.followUpDate)}</span>`
        : p.stage === 0 ? html`<span class="due-tag upcoming">Not contacted</span>` : html`<span class="muted">—</span>`}
    </div>
    <div class="cell cell-reply">
      ${p.replyStatus === 'positive' ? html`<${Pill} color="green">Replied<//>`
        : p.replyStatus === 'negative' ? html`<${Pill} color="rose">Declined<//>`
        : html`<span class="muted" style="font-size:12.5px">—</span>`}
    </div>
    <div class="cell row-actions">
      ${stageLabel && html`<${IconButton} name="zap" title=${'Quick send ' + stageLabel + ' (copy + mark sent)'} onClick=${() => onQuick(p)} />`}
      <${Menu} trigger=${html`<button class="icon-btn" title="More"><${Icon} name="menu" size=16 /></button>`}
        items=${[
          stageLabel && { label: 'Compose…', icon: 'message', onClick: () => onSend(p.id) },
          due && { label: 'Snooze 1 day', icon: 'clock', onClick: () => onSnooze(p.id, 1) },
          due && { label: 'Snooze 3 days', icon: 'clock', onClick: () => onSnooze(p.id, 3) },
          due && { label: 'Snooze 1 week', icon: 'clock', onClick: () => onSnooze(p.id, 7) },
          p.handle && { label: 'Open Instagram', icon: 'instagram', onClick: () => window.open('https://instagram.com/' + p.handle, '_blank') },
          { label: p.archived ? 'Unarchive' : 'Archive', icon: 'archive', onClick: () => bulkArchive([p.id], !p.archived) },
        ]} />
    </div>
  </div>`;
}

function BulkBar({ ids, state, onClear, onDone }) {
  const doGroup = () => { const t = prompt('Add these ' + ids.length + ' prospects to which Group?'); if (t) { bulkTag(ids, t); onDone(`Grouped ${ids.length}`); } };
  const groupOpts = [...new Set([...(state.suggestedTags || []), ...state.prospects.flatMap((p) => p.tags || [])])];
  return html`<div class="bulk-bar">
    <span class="row-flex"><b>${ids.length}</b> selected</span>
    <${Menu} align="left" trigger=${html`<button class="btn btn-sm">Move to stage ▾</button>`}
      items=${state.groups.map((g) => ({ label: g.name, onClick: () => { bulkMove(ids, g.id); onDone(`Moved ${ids.length}`); } }))} />
    <${Menu} align="left" trigger=${html`<button class="btn btn-sm">Set type ▾</button>`}
      items=${(state.settings.prospectTypes || []).map((s) => ({ label: s, onClick: () => { bulkSetService(ids, s); onDone(`Updated ${ids.length}`); } }))} />
    <${Menu} align="left" trigger=${html`<button class="btn btn-sm">Add to group ▾</button>`}
      items=${[...groupOpts.map((t) => ({ label: t, icon: 'plus', onClick: () => { bulkTag(ids, t); onDone(`Grouped ${ids.length}`); } })), { label: 'New group…', onClick: doGroup }]} />
    <${Button} size="sm" icon="archive" onClick=${() => { bulkArchive(ids, true); onDone(`Archived ${ids.length}`); }}>Archive<//>
    <${Button} size="sm" variant="danger" icon="trash" onClick=${() => { if (confirm('Delete ' + ids.length + ' prospects permanently?')) { bulkDelete(ids); onDone(`Deleted ${ids.length}`); } }}>Delete<//>
    <div class="spacer"></div>
    <${Button} size="sm" variant="ghost" onClick=${onClear}>Clear<//>
  </div>`;
}

const GROUP_BY = [
  { value: 'stage', label: 'Pipeline Stage' },
  { value: 'group', label: 'Group' },
  { value: 'type', label: 'Prospect Type' },
  { value: 'source', label: 'Lead Source' },
];

export function PipelineView({ onOpen, onSend, onAdd }) {
  const state = useStore();
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('');
  const [fSource, setFSource] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [groupMode, setGroupMode] = useState('stage');
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());
  const [sel, setSel] = useState(() => new Set());

  // In-use values for the filter dropdowns (keeps them tidy).
  const typesInUse = useMemo(() => [...new Set(state.prospects.map((p) => p.service).filter(Boolean))].sort(), [state.prospects]);
  const sourcesInUse = useMemo(() => [...new Set(state.prospects.map((p) => p.leadSource).filter((s) => s && s !== NOT_SPECIFIED))].sort(), [state.prospects]);
  const groupsInUse = useMemo(() => [...new Set([...(state.suggestedTags || []), ...state.prospects.flatMap((p) => p.tags || [])])].sort(), [state.prospects, state.suggestedTags]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.prospects.filter((p) => {
      if (p.archived && !showArchived) return false;
      if (fType && p.service !== fType) return false;
      if (fSource && (p.leadSource || NOT_SPECIFIED) !== fSource) return false;
      if (fGroup && !(p.tags || []).includes(fGroup)) return false;
      if (dueOnly && !isDue(p)) return false;
      if (query) {
        const hay = (p.name + ' ' + p.handle + ' ' + p.notes + ' ' + (p.propertyNotes || '') + ' ' + p.service + ' ' + (p.leadSource || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.email || '') + ' ' + (p.location || '')).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [state.prospects, q, fType, fSource, fGroup, dueOnly, showArchived]);

  const toggleKey = (k) => setCollapsedKeys((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const sections = useMemo(() => {
    // Group by pipeline stage (the workspace sections).
    if (groupMode === 'stage') {
      const byGroup = {};
      state.groups.forEach((g) => { byGroup[g.id] = []; });
      filtered.forEach((p) => { (byGroup[p.groupId] || (byGroup[p.groupId] = [])).push(p); });
      return state.groups.map((g) => ({ key: g.id, name: g.name, color: g.color, collapsed: g.collapsed, onToggle: () => toggleGroup(g.id), rows: (byGroup[g.id] || []).slice().sort(byAdded) }));
    }
    // Group by a single-value field (type/source) or many-valued groups.
    const UNSET = groupMode === 'group' ? '· Ungrouped' : NOT_SPECIFIED;
    const map = new Map();
    const ensure = (k) => { if (!map.has(k)) map.set(k, []); return map.get(k); };
    if (groupMode === 'group') (state.suggestedTags || []).forEach((t) => ensure(t));
    filtered.forEach((p) => {
      if (groupMode === 'group') {
        const gs = p.tags || [];
        if (gs.length === 0) ensure(UNSET).push(p); else gs.forEach((t) => ensure(t).push(p));
      } else {
        const v = (groupMode === 'type' ? p.service : p.leadSource) || UNSET;
        ensure(v).push(p);
      }
    });
    const keys = [...map.keys()].filter((k) => k !== UNSET && map.get(k).length);
    keys.sort();
    if (map.get(UNSET) && map.get(UNSET).length) keys.push(UNSET);
    return keys.map((k) => ({
      key: groupMode + ':' + k, name: k === UNSET ? UNSET.replace('· ', '') : k,
      color: (groupMode === 'group' && k !== UNSET) ? tagColor(k) : 'slate',
      collapsed: collapsedKeys.has(groupMode + ':' + k),
      onToggle: () => toggleKey(groupMode + ':' + k),
      rows: map.get(k).slice().sort(byAdded),
    }));
  }, [filtered, state.groups, state.suggestedTags, groupMode, collapsedKeys]);

  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  const selectAllFiltered = () => setSel(new Set(filtered.map((p) => p.id)));
  const bulkDone = (msg) => { toast(msg); clearSel(); };

  const quickSend = async (p) => {
    const sug = suggestVariant(state, p);
    if (!sug.label) { toast('Sequence complete'); return; }
    await copyText(fillTemplate(sug.text, p));
    markSent(p.id, { variant: sug.variant });
    toast(`Copied & sent ${sug.label} → ${p.name}`, 'copy');
  };
  const doSnooze = (id, d) => { snoozeProspect(id, d); toast(`Snoozed ${d === 1 ? '1 day' : d === 7 ? '1 week' : d + ' days'}`); };

  const total = filtered.length;
  const selIds = [...sel].filter((id) => filtered.some((p) => p.id === id));
  const filtering = q || fType || fSource || fGroup || dueOnly;

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">📇</span> Pipeline</h1>
      <span class="muted" style="font-size:13px">${total} ${total === 1 ? 'prospect' : 'prospects'} · ${state.wsName}</span>
      <div class="spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${onAdd}>Add prospect<//>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <${Icon} name="search" size=16 />
        <input placeholder="Search name, handle, group, notes…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      </div>
      <select class="input select" style="width:auto" value=${fType} onChange=${(e) => setFType(e.target.value)}>
        <option value="">All types</option>
        ${typesInUse.map((s) => html`<option value=${s}>${s}</option>`)}
      </select>
      <select class="input select" style="width:auto" value=${fSource} onChange=${(e) => setFSource(e.target.value)}>
        <option value="">All sources</option>
        ${sourcesInUse.map((s) => html`<option value=${s}>${s}</option>`)}
        <option value=${NOT_SPECIFIED}>${NOT_SPECIFIED}</option>
      </select>
      ${groupsInUse.length > 0 && html`<select class="input select" style="width:auto" value=${fGroup} onChange=${(e) => setFGroup(e.target.value)}>
        <option value="">All groups</option>
        ${groupsInUse.map((t) => html`<option value=${t}>${t}</option>`)}
      </select>`}
      <div class="row-flex" style="gap:5px" title="Group rows by">
        <${Icon} name="grid" size=14 style="color:var(--muted)" />
        <select class="input select" style="width:auto" value=${groupMode} onChange=${(e) => { setGroupMode(e.target.value); setCollapsedKeys(new Set()); }}>
          ${GROUP_BY.map((o) => html`<option value=${o.value}>Group: ${o.label}</option>`)}
        </select>
      </div>
      <button class=${'filter-chip ' + (dueOnly ? 'active' : '')} onClick=${() => setDueOnly(!dueOnly)}>
        <${Icon} name="clock" size=14 /> Due only</button>
      <button class=${'filter-chip ' + (showArchived ? 'active' : '')} onClick=${() => setShowArchived(!showArchived)}>
        <${Icon} name="archive" size=14 /> ${showArchived ? 'Showing archived' : 'Hide archived'}</button>
      ${filtering && html`<button class="filter-chip" onClick=${() => { setQ(''); setFType(''); setFSource(''); setFGroup(''); setDueOnly(false); }}><${Icon} name="x" size=14 /> Clear</button>`}
      ${selIds.length === 0 && total > 0 && html`<button class="filter-chip" onClick=${selectAllFiltered}><${Icon} name="check" size=14 /> Select all</button>`}
    </div>

    ${selIds.length > 0 && html`<${BulkBar} ids=${selIds} state=${state} onClear=${clearSel} onDone=${bulkDone} />`}

    <div class="view table-wrap">
      <div class="row-head">
        <div></div><div>Prospect</div><div class="cell-service">Prospect Type</div>
        <div class="cell-notes">Property notes</div>
        <div class="cell-stage">Sequence</div><div class="cell-due-col">Next due</div>
        <div class="cell-reply">Reply</div><div></div>
      </div>
      ${total === 0 && html`<${EmptyState} icon="search" title="No prospects match">Try clearing filters or add a new prospect.<//>`}
      ${sections.map((sec) => {
        if (sec.rows.length === 0 && (filtering || groupMode !== 'stage')) return null;
        return html`<div class="group-block" key=${sec.key}>
          <div class="group-header" onClick=${sec.onToggle}>
            <${Icon} name="chevronRight" size=16 className=${'chev ' + (sec.collapsed ? '' : 'open')} />
            <span class="group-bar" style=${`--pc:var(--pc-${sec.color})`}></span>
            <span class="group-title">${sec.name}</span>
            <span class="group-count">${sec.rows.length}</span>
            ${sec.rows.some((p) => isDue(p)) && html`<span class="group-due"><${Pill} color="amber">${sec.rows.filter((p) => isDue(p)).length} due<//></span>`}
          </div>
          ${!sec.collapsed && sec.rows.map((p) => html`<${Row} key=${p.id} p=${p} state=${state}
            selected=${sel.has(p.id)} onSelect=${toggleSel}
            onOpen=${onOpen} onSend=${onSend} onQuick=${quickSend} onSnooze=${doSnooze} />`)}
          ${!sec.collapsed && sec.rows.length === 0 && html`<div class="row" style="min-height:40px"><div></div><div class="cell muted" style="font-size:13px">No prospects here</div></div>`}
        </div>`;
      })}
    </div>
  </div>`;
}
