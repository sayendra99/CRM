// Central store: single source of truth + all mutations.
//
// v2 introduces WORKSPACES ("outreach clients"). The raw persisted state holds
// every workspace; views and logic see a flat PROJECTION of the active
// workspace merged with global settings — so almost all existing code that
// reads state.prospects / state.groups / state.messages / etc. keeps working
// unchanged, but each workspace stays fully isolated.
import { useReducer, useEffect } from './dom.js';
import { makeAdapter } from './storage.js';
import { buildInitialState, migrateToLatest, blankWorkspace, DEFAULT_PROSPECT_TYPES, DEFAULT_LEAD_SOURCES, NOT_SPECIFIED } from './seed.js';
import { uid, todayISO, addDays, nextWorkday, jitterDays, daysBetween } from './util.js';

const adapter = makeAdapter();
const listeners = new Set();
let raw = init();
let state = project(raw);

function init() {
  const saved = adapter.load();
  if (saved && Array.isArray(saved.workspaces) && saved.version >= 3) return normalize(saved);
  if (saved && (Array.isArray(saved.workspaces) || Array.isArray(saved.prospects))) {
    const m = normalize(migrateToLatest(saved));
    adapter.save(m);
    return m;
  }
  const fresh = buildInitialState();
  adapter.save(fresh);
  return fresh;
}

// Additive forward-migration for v2 states from older builds.
function normalize(r) {
  r.workspaces = r.workspaces.map((w) => ({
    color: 'violet', serviceTypes: [], suggestedTags: [], kpiLog: {}, activity: [],
    ...w,
    // Backfill the SA workspace's preset type-tags if it predates the feature.
    suggestedTags: Array.isArray(w.suggestedTags) && w.suggestedTags.length ? w.suggestedTags
      : (w.id === 'ws_sa' ? ['Contractors', 'Corporate Guests'] : []),
    palette: w.palette || (w.id === 'ws_sa' ? 'gumdrop' : w.id === 'ws_barbon' ? 'muted-dusk' : 'violet'),
    prospects: (w.prospects || []).map((p) => ({
      email: '', phone: '', website: '', location: '', propertyNotes: '', tags: [], custom: {}, leadSource: NOT_SPECIFIED,
      ...p,
      leadSource: p.leadSource || NOT_SPECIFIED,
      tags: Array.isArray(p.tags) ? p.tags : [],
      custom: p.custom && typeof p.custom === 'object' ? p.custom : {},
      history: Array.isArray(p.history) ? p.history : [],
    })),
  }));
  r.settings = { customFields: [], lastBackup: null, autoBackup: false, ...r.settings };
  if (!Array.isArray(r.settings.customFields)) r.settings.customFields = [];
  if (!Array.isArray(r.settings.prospectTypes) || !r.settings.prospectTypes.length) r.settings.prospectTypes = [...DEFAULT_PROSPECT_TYPES];
  if (!Array.isArray(r.settings.leadSources) || !r.settings.leadSources.length) r.settings.leadSources = [...DEFAULT_LEAD_SOURCES];
  if (!r.activeWs || !r.workspaces.find((w) => w.id === r.activeWs)) r.activeWs = r.workspaces[0].id;
  return r;
}

// ---- Projection: what views + logic.js see via getState()/useStore() ----
function project(r) {
  const ws = r.workspaces.find((w) => w.id === r.activeWs) || r.workspaces[0];
  return {
    version: r.version, activeWs: ws.id, settings: r.settings, workspaces: r.workspaces,
    wsName: ws.name, wsColor: ws.color, palette: ws.palette || 'violet', serviceTypes: ws.serviceTypes || [], suggestedTags: ws.suggestedTags || [],
    prospects: ws.prospects, groups: ws.groups, messages: ws.messages, kpis: ws.kpis,
    kpiLog: ws.kpiLog, checklist: ws.checklist, automations: ws.automations, activity: ws.activity,
  };
}

let saveTimer = null;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => adapter.save(raw), 150); }
function emit() { state = project(raw); listeners.forEach((l) => l()); }

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function commitRaw(nextRaw) { raw = nextRaw; persist(); emit(); }
function curWs() { return raw.workspaces.find((w) => w.id === raw.activeWs) || raw.workspaces[0]; }
// Patch the ACTIVE workspace (object or updater fn).
function commitWs(patch) {
  const w = curWs();
  const nw = { ...w, ...(typeof patch === 'function' ? patch(w) : patch) };
  commitRaw({ ...raw, workspaces: raw.workspaces.map((x) => (x.id === nw.id ? nw : x)) });
}

export function useStore(selector = (s) => s) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => subscribe(force), []);
  return selector(state);
}

// ---- helpers ----
function replaceProspect(list, id, patch) {
  return list.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p));
}
function withActivity(entry) {
  return [{ id: uid('act'), date: todayISO(), ts: Date.now(), ...entry }, ...curWs().activity].slice(0, 800);
}
function groupName(id) { const g = curWs().groups.find((x) => x.id === id); return g ? g.name : id; }

// ---- Automation engine (operates on the active workspace) ----
function triggerMatches(trigger, prospect, event) {
  if (!trigger) return false;
  if (trigger.type === 'reply') return event.kind === 'reply' && (trigger.value === 'any' || trigger.value === event.value);
  if (trigger.type === 'stage') {
    if (event.kind !== 'stage') return false;
    const s = prospect.stage; const v = Number(trigger.value);
    switch (trigger.op) {
      case '>=': return s >= v; case '<=': return s <= v; case '==': return s === v;
      case '>': return s > v; case '<': return s < v; default: return false;
    }
  }
  // Time-based: contacted, still no reply, and quiet for N+ days.
  if (trigger.type === 'stale') {
    if (event.kind !== 'time') return false;
    if (prospect.archived) return false;
    if ((prospect.stage || 0) < 1) return false;
    if (prospect.replyStatus && prospect.replyStatus !== 'none') return false;
    const ref = prospect.lastInteraction || prospect.followUpDate;
    if (!ref) return false;
    return daysBetween(ref, todayISO()) >= Number(trigger.value);
  }
  return false;
}
function applyAction(prospect, action) {
  const p = { ...prospect };
  if (action.type === 'move') p.groupId = action.groupId;
  else if (action.type === 'archive') p.archived = true;
  else if (action.type === 'setStage') p.stage = Number(action.value) || 0;
  else if (action.type === 'group') { const t = String(action.group || '').trim(); if (t) p.tags = [...new Set([...(p.tags || []), t])]; }
  return p;
}
function snapshot(p) { return p.groupId + '|' + (p.archived ? 1 : 0) + '|' + (p.stage || 0) + '|' + (p.tags || []).slice().sort().join(','); }
function runAutomations(prospect, event) {
  if (!raw.settings.autorunAutomations) return { prospect, applied: [] };
  let p = prospect; const applied = [];
  for (const a of curWs().automations) {
    if (!a.enabled) continue;
    if (triggerMatches(a.trigger, p, event)) {
      const before = snapshot(p);
      p = applyAction(p, a.action);
      if (snapshot(p) !== before) applied.push(a.name);
    }
  }
  return { prospect: p, applied };
}

// Condition (field) triggers — evaluated once when a prospect is added/imported.
function fieldMatches(t, p) {
  if (!t) return false;
  if (t.field === 'group') return (p.tags || []).includes(t.value);
  if (t.field === 'leadSource') return (p.leadSource || 'Not specified') === t.value;
  return (p[t.field] || '') === t.value; // 'service' (Prospect Type)
}
function runFieldAutomations(prospect) {
  if (!raw.settings.autorunAutomations) return { prospect, applied: [] };
  let p = prospect; const applied = [];
  for (const a of curWs().automations) {
    if (!a.enabled || !a.trigger || a.trigger.type !== 'field') continue;
    if (fieldMatches(a.trigger, p)) {
      const before = snapshot(p);
      p = applyAction(p, a.action);
      if (snapshot(p) !== before) applied.push(a.name);
    }
  }
  return { prospect: p, applied };
}

// Time-based automations run across ALL workspaces (date-driven, not event-driven).
export function runTimeAutomations() {
  if (!raw.settings.autorunAutomations) return 0;
  let changed = 0;
  const workspaces = raw.workspaces.map((w) => {
    const rules = (w.automations || []).filter((a) => a.enabled && a.trigger && a.trigger.type === 'stale');
    if (!rules.length) return w;
    let activity = w.activity;
    const prospects = w.prospects.map((p) => {
      let np = p; const names = [];
      for (const a of rules) {
        if (triggerMatches(a.trigger, np, { kind: 'time' })) {
          const before = snapshot(np);
          np = applyAction(np, a.action);
          if (snapshot(np) !== before) names.push(a.name);
        }
      }
      if (names.length) {
        changed++;
        names.forEach((name) => { activity = [{ id: uid('act'), date: todayISO(), ts: Date.now(), type: 'automation', prospectId: p.id, label: `Automation: ${name}` }, ...activity].slice(0, 800); });
      }
      return np;
    });
    return { ...w, prospects, activity };
  });
  if (changed) commitRaw({ ...raw, workspaces });
  return changed;
}

// ================= PROSPECT MUTATIONS =================
export function addProspect(data) {
  const p = {
    id: uid('p'), name: data.name || data.handle || 'Unnamed',
    handle: (data.handle || '').replace(/^@/, ''), service: data.service || '',
    leadSource: data.leadSource || NOT_SPECIFIED,
    groupId: data.groupId || (curWs().groups[0] && curWs().groups[0].id), stage: 0, replyStatus: 'none',
    followUpDate: data.followUpDate || todayISO(), lastInteraction: null,
    notes: data.notes || '', archived: false, history: [], createdAt: todayISO(), createdTs: Date.now(),
    email: data.email || '', phone: data.phone || '', website: data.website || '',
    location: data.location || '', propertyNotes: data.propertyNotes || '', tags: data.tags || [], custom: data.custom || {},
  };
  // Auto-route on creation via any matching field automations.
  const { prospect: routed, applied } = runFieldAutomations(p);
  // Newest prospects go to the BOTTOM (oldest stay on top).
  commitWs((w) => {
    let activity = [{ id: uid('act'), date: todayISO(), ts: Date.now(), type: 'added', prospectId: routed.id, label: `Added ${routed.name}` }, ...w.activity].slice(0, 800);
    applied.forEach((name) => { activity = [{ id: uid('act'), date: todayISO(), ts: Date.now(), type: 'automation', prospectId: routed.id, label: `Automation: ${name}` }, ...activity].slice(0, 800); });
    return { prospects: [...w.prospects, routed], activity };
  });
  return routed;
}
export function updateProspect(id, patch) { commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, patch) })); }
export function moveProspect(id, groupId) {
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, { groupId }), activity: withActivity({ type: 'move', prospectId: id, label: `Moved to ${groupName(groupId)}` }) }));
}
export function archiveProspect(id, archived = true) { commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, { archived }) })); }
export function deleteProspect(id) { commitWs((w) => ({ prospects: w.prospects.filter((p) => p.id !== id) })); }

// ---- Tags ----
export function addTag(id, tag) {
  const t = String(tag || '').trim(); if (!t) return;
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, (p) => ({ tags: [...new Set([...(p.tags || []), t])] })) }));
}
export function removeTag(id, tag) {
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, (p) => ({ tags: (p.tags || []).filter((x) => x !== tag) })) }));
}

// ---- Custom fields (definitions global, values per-prospect) ----
export function setCustomValue(id, fieldId, value) {
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, (p) => ({ custom: { ...(p.custom || {}), [fieldId]: value } })) }));
}
export function addCustomField(label) {
  const l = String(label || '').trim(); if (!l) return;
  commitRaw({ ...raw, settings: { ...raw.settings, customFields: [...(raw.settings.customFields || []), { id: uid('cf'), label: l }] } });
}
export function removeCustomField(fieldId) {
  commitRaw({ ...raw, settings: { ...raw.settings, customFields: (raw.settings.customFields || []).filter((f) => f.id !== fieldId) } });
}

// ---- Manual note / interaction ----
export function logNote(id, text, date) {
  const t = String(text || '').trim(); if (!t) return;
  const entry = { id: uid('h'), date: date || todayISO(), type: 'note', text: t };
  const p = curWs().prospects.find((x) => x.id === id);
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, (pp) => ({ history: [...pp.history, entry], lastInteraction: date || todayISO() })), activity: withActivity({ type: 'note', prospectId: id, label: `Note on ${p ? p.name : ''}` }) }));
}

// ---- Send / advance pipeline ----
export function markSent(id, { variant, note } = {}) {
  const w = curWs();
  const p = w.prospects.find((x) => x.id === id);
  if (!p) return;
  const { stageOrder, cadenceDays } = w.messages;
  const stageIndex = p.stage;
  if (stageIndex >= stageOrder.length) return;
  const stageLabel = stageOrder[stageIndex];
  const entry = { id: uid('h'), date: todayISO(), type: 'sent', stageIndex, stageLabel, variant: variant ?? 0, note: note || '' };
  const newStage = p.stage + 1;
  let followUpDate = null;
  if (newStage < stageOrder.length) {
    const nextLabel = stageOrder[newStage];
    let days = cadenceDays[nextLabel] ?? 3;
    if (raw.settings.jitter) days += jitterDays(id + newStage);
    followUpDate = addDays(todayISO(), Math.max(1, days));
    if (raw.settings.workdaysOnly) followUpDate = nextWorkday(followUpDate);
  }
  let updated = { ...p, stage: newStage, lastInteraction: todayISO(), followUpDate, history: [...p.history, entry] };
  const { prospect: afterAuto, applied } = runAutomations(updated, { kind: 'stage' });
  updated = afterAuto;
  let activity = withActivity({ type: 'sent', prospectId: id, label: `${stageLabel} → ${p.name}` });
  applied.forEach((name) => { activity = [{ id: uid('act'), date: todayISO(), ts: Date.now(), type: 'automation', prospectId: id, label: `Automation: ${name}` }, ...activity].slice(0, 800); });
  commitWs((ww) => ({ prospects: replaceProspect(ww.prospects, id, updated), activity }));
}
export function undoLastSend(id) {
  const p = curWs().prospects.find((x) => x.id === id);
  if (!p || p.stage <= 0) return;
  const history = [...p.history]; history.pop();
  const prev = history.filter((h) => h.type === 'sent').slice(-1)[0];
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, { stage: Math.max(0, p.stage - 1), history, lastInteraction: prev ? prev.date : null, followUpDate: todayISO() }) }));
}
export function setReply(id, value) {
  const p = curWs().prospects.find((x) => x.id === id);
  if (!p) return;
  let updated = { ...p, replyStatus: value, lastInteraction: todayISO() };
  if (value !== 'none') updated.history = [...p.history, { id: uid('h'), date: todayISO(), type: 'reply', value }];
  const { prospect: afterAuto, applied } = runAutomations(updated, { kind: 'reply', value });
  updated = afterAuto;
  let activity = curWs().activity;
  if (value !== 'none') activity = withActivity({ type: 'reply', prospectId: id, value, label: `Reply (${value}) from ${p.name}` });
  applied.forEach((name) => { activity = [{ id: uid('act'), date: todayISO(), ts: Date.now(), type: 'automation', prospectId: id, label: `Automation: ${name}` }, ...activity].slice(0, 800); });
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, updated), activity }));
}

// ---- Snooze ----
export function snoozeProspect(id, days) {
  const p = curWs().prospects.find((x) => x.id === id);
  if (!p) return;
  const base = p.followUpDate && new Date(p.followUpDate) > new Date(todayISO()) ? p.followUpDate : todayISO();
  let next = addDays(base, days);
  if (raw.settings.workdaysOnly) next = nextWorkday(next);
  commitWs((w) => ({ prospects: replaceProspect(w.prospects, id, { followUpDate: next }) }));
}

// ---- Bulk actions ----
export function bulkUpdate(ids, patch) { const set = new Set(ids); commitWs((w) => ({ prospects: w.prospects.map((p) => (set.has(p.id) ? { ...p, ...patch } : p)) })); }
export function bulkMove(ids, groupId) { bulkUpdate(ids, { groupId }); }
export function bulkSetService(ids, service) { bulkUpdate(ids, { service }); }
export function bulkArchive(ids, archived = true) { bulkUpdate(ids, { archived }); }
export function bulkTag(ids, tag) {
  const t = String(tag || '').trim(); if (!t) return; const set = new Set(ids);
  commitWs((w) => ({ prospects: w.prospects.map((p) => (set.has(p.id) ? { ...p, tags: [...new Set([...(p.tags || []), t])] } : p)) }));
}
export function bulkDelete(ids) { const set = new Set(ids); commitWs((w) => ({ prospects: w.prospects.filter((p) => !set.has(p.id)) })); }

// ================= GROUPS =================
export function toggleGroup(id) { commitWs((w) => ({ groups: w.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)) })); }
export function addGroup(name, color = 'slate') { commitWs((w) => ({ groups: [...w.groups, { id: uid('g'), name, color, collapsed: false }] })); }
export function updateGroup(id, patch) { commitWs((w) => ({ groups: w.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })); }
export function deleteGroup(id) {
  const w = curWs(); if (w.groups.length <= 1) return;
  const fallback = w.groups.find((g) => g.id !== id).id;
  commitWs(() => ({ groups: w.groups.filter((g) => g.id !== id), prospects: w.prospects.map((p) => (p.groupId === id ? { ...p, groupId: fallback } : p)) }));
}
export function reorderGroups(ids) { const w = curWs(); const map = Object.fromEntries(w.groups.map((g) => [g.id, g])); commitWs({ groups: ids.map((id) => map[id]).filter(Boolean) }); }
// Move a pipeline stage up (-1) or down (+1).
export function moveGroup(id, dir) {
  const w = curWs();
  const i = w.groups.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= w.groups.length) return;
  const groups = w.groups.slice();
  [groups[i], groups[j]] = [groups[j], groups[i]];
  commitWs({ groups });
}

// ================= MESSAGES =================
export function updateVariant(service, stageLabel, index, text) {
  const library = structuredClone(curWs().messages.library);
  library[service][stageLabel][index] = text;
  commitWs((w) => ({ messages: { ...w.messages, library } }));
}
export function addVariant(service, stageLabel) {
  const library = structuredClone(curWs().messages.library);
  library[service][stageLabel].push('');
  commitWs((w) => ({ messages: { ...w.messages, library } }));
}
export function removeVariant(service, stageLabel, index) {
  const library = structuredClone(curWs().messages.library);
  if (library[service][stageLabel].length <= 1) return;
  library[service][stageLabel].splice(index, 1);
  commitWs((w) => ({ messages: { ...w.messages, library } }));
}
export function updateCadence(stageLabel, days) { commitWs((w) => ({ messages: { ...w.messages, cadenceDays: { ...w.messages.cadenceDays, [stageLabel]: Number(days) } } })); }

// ================= KPIs =================
export function addKpi(kpi) { commitWs((w) => ({ kpis: [...w.kpis, { id: uid('k'), source: 'manual', period: 'daily', color: 'violet', unit: '', ...kpi }] })); }
export function updateKpi(id, patch) { commitWs((w) => ({ kpis: w.kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)) })); }
export function deleteKpi(id) { commitWs((w) => ({ kpis: w.kpis.filter((k) => k.id !== id) })); }
export function logKpi(id, delta) {
  const day = todayISO(); const w = curWs();
  const dayLog = { ...(w.kpiLog[day] || {}) }; dayLog[id] = Math.max(0, (dayLog[id] || 0) + delta);
  commitWs({ kpiLog: { ...w.kpiLog, [day]: dayLog } });
}
export function setKpiValue(id, value) {
  const day = todayISO(); const w = curWs();
  const dayLog = { ...(w.kpiLog[day] || {}) }; dayLog[id] = Math.max(0, value);
  commitWs({ kpiLog: { ...w.kpiLog, [day]: dayLog } });
}

// ================= CHECKLIST =================
export function toggleChecklist(date, itemId) {
  const w = curWs(); const dayLog = { ...(w.checklist.log[date] || {}) }; dayLog[itemId] = !dayLog[itemId];
  commitWs({ checklist: { ...w.checklist, log: { ...w.checklist.log, [date]: dayLog } } });
}
export function addChecklistItem(item) { commitWs((w) => ({ checklist: { ...w.checklist, items: [...w.checklist.items, { id: uid('c'), period: 'daily', type: 'success', ...item }] } })); }
export function removeChecklistItem(id) { commitWs((w) => ({ checklist: { ...w.checklist, items: w.checklist.items.filter((i) => i.id !== id) } })); }

// ================= AUTOMATIONS =================
export function addAutomation(a) { commitWs((w) => ({ automations: [...w.automations, { id: uid('a'), enabled: true, ...a }] })); }
export function updateAutomation(id, patch) { commitWs((w) => ({ automations: w.automations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })); }
export function deleteAutomation(id) { commitWs((w) => ({ automations: w.automations.filter((a) => a.id !== id) })); }
export function toggleAutomation(id) { commitWs((w) => ({ automations: w.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) })); }

// ================= SETTINGS (global) =================
export function updateSettings(patch) { commitRaw({ ...raw, settings: { ...raw.settings, ...patch } }); }

// ---- Global pick-lists: Prospect Types & Lead Sources ----
function addToList(key, value) {
  const v = String(value || '').trim(); if (!v) return;
  const list = raw.settings[key] || [];
  if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return;
  commitRaw({ ...raw, settings: { ...raw.settings, [key]: [...list, v] } });
}
function removeFromList(key, value) {
  commitRaw({ ...raw, settings: { ...raw.settings, [key]: (raw.settings[key] || []).filter((x) => x !== value) } });
}
export function addProspectType(v) { addToList('prospectTypes', v); }
export function removeProspectType(v) { removeFromList('prospectTypes', v); }
export function addLeadSource(v) { addToList('leadSources', v); }
export function removeLeadSource(v) { removeFromList('leadSources', v); }

// ================= WORKSPACES =================
export function switchWorkspace(id) { if (raw.workspaces.find((w) => w.id === id)) commitRaw({ ...raw, activeWs: id }); }
export function addWorkspace({ name, color = 'blue' }) {
  const ws = blankWorkspace(name || 'New workspace', color);
  commitRaw({ ...raw, workspaces: [...raw.workspaces, ws], activeWs: ws.id });
  return ws;
}
export function updateWorkspace(id, patch) { commitRaw({ ...raw, workspaces: raw.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)) }); }
export function deleteWorkspace(id) {
  if (raw.workspaces.length <= 1) return;
  const rest = raw.workspaces.filter((w) => w.id !== id);
  commitRaw({ ...raw, workspaces: rest, activeWs: raw.activeWs === id ? rest[0].id : raw.activeWs });
}

// ================= IMPORT / EXPORT / BACKUP =================
export function exportState() { return JSON.stringify(raw, null, 2); }
export function noteBackup() { commitRaw({ ...raw, settings: { ...raw.settings, lastBackup: todayISO() } }); }
export function replaceState(next) {
  if (!next) throw new Error('Invalid backup file');
  if (Array.isArray(next.workspaces) || Array.isArray(next.prospects)) { commitRaw(normalize(migrateToLatest(next))); return; }
  throw new Error('Unrecognised backup file');
}
const SAFETY_KEY = 'barbon-crm-safety';
export function resetAll() {
  try { localStorage.setItem(SAFETY_KEY, JSON.stringify({ at: Date.now(), state: raw })); } catch (e) {}
  commitRaw(buildInitialState());
}
export function hasSafetySnapshot() { try { return !!localStorage.getItem(SAFETY_KEY); } catch (e) { return false; } }
export function restoreSafetySnapshot() {
  try {
    const rawSnap = localStorage.getItem(SAFETY_KEY);
    if (!rawSnap) return false;
    const { state: prev } = JSON.parse(rawSnap);
    if (prev && (Array.isArray(prev.workspaces) || Array.isArray(prev.prospects))) { commitRaw(normalize(migrateToLatest(prev))); localStorage.removeItem(SAFETY_KEY); return true; }
  } catch (e) {}
  return false;
}

// Bulk import into the ACTIVE workspace, deduped on handle.
export function importProspects(rows) {
  const w = curWs();
  const existing = new Set(w.prospects.map((p) => (p.handle || '').toLowerCase()).filter(Boolean));
  const added = []; let duplicates = 0;
  for (const r of rows) {
    const handle = (r.handle || '').replace(/^@/, '').trim();
    const key = handle.toLowerCase();
    if (key && existing.has(key)) { duplicates++; continue; }
    if (key) existing.add(key);
    const obj = {
      id: uid('p'), name: r.name || handle || 'Unnamed', handle, service: r.service || '',
      leadSource: r.leadSource || NOT_SPECIFIED,
      groupId: r.groupId || (w.groups[0] && w.groups[0].id), stage: 0, replyStatus: 'none',
      followUpDate: todayISO(), lastInteraction: null, notes: r.notes || '',
      archived: false, history: [], createdAt: todayISO(), createdTs: Date.now(),
      email: r.email || '', phone: r.phone || '', website: r.website || '', location: r.location || '', propertyNotes: r.propertyNotes || '', tags: r.tags || [], custom: {},
    };
    // Auto-route imported prospects too.
    added.push(runFieldAutomations(obj).prospect);
  }
  // Imported prospects append to the BOTTOM.
  if (added.length) commitWs((ww) => ({ prospects: [...ww.prospects, ...added], activity: withActivity({ type: 'import', label: `Imported ${added.length} prospects` }) }));
  return { added: added.length, duplicates };
}
