// Builds the initial multi-workspace state and migrates older saves.
//
// DATA-MODEL NOTE (v3): the app separates five dimensions per prospect —
//   Prospect Type  -> prospect.service      (one; global pick-list settings.prospectTypes)
//   Lead Source    -> prospect.leadSource   (one; global pick-list settings.leadSources)
//   Groups         -> prospect.tags         (MANY; the "tags" field, shown in UI as "Groups")
//   Pipeline Stage -> prospect.groupId      (one; the workspace sections, shown as "Pipeline Stage")
//   Follow-up      -> prospect.followUpDate + prospect.stage (message sequence)
// Internal field names are kept (service/tags/groupId) to avoid churn on 1,200+
// live records; only the USER-FACING LABELS changed. Keep this mapping in mind.
import SEED_PROSPECTS from './data/seed-prospects.js';
import SEED_MESSAGES from './data/seed-messages.js';
import SEED_SA from './data/seed-sa.js';
import { uid, todayISO, addDays, nextWorkday } from './util.js';

export const SERVICE_TYPES = [
  'Property Investor', 'Architect', 'Interior Designer', 'Estate Agent',
  'Lettings / Property Management', 'SA Provider', 'Property Developer',
  'Deal Sourcer', 'Property Entrepreneur',
];

// Global pick-lists (shared across workspaces — user's choice).
export const DEFAULT_PROSPECT_TYPES = [
  'Property Investor', 'Estate Agent', 'Property Manager', 'HMO Manager',
  'Serviced Accommodation Operator', 'Property Developer', 'Property Sourcer',
  'Deal Sourcer', 'Property Entrepreneur', 'Architect', 'Interior Designer',
  'Lettings / Property Management', 'SA Provider',
  'Cleaner', 'Maintenance / Handyman', 'Linen & Laundry', 'Locksmith / Key Safe',
  'Handover / Co-host', 'Relocation Agency', 'Corporate Travel Booker',
  'Construction Firm', 'Insurance / Housing', 'Film & TV Production', 'Other',
];
export const DEFAULT_LEAD_SOURCES = [
  'Instagram', 'Networking Event', 'Physical Walk-in', 'Referral', 'Website',
  'LinkedIn', 'Cold Email', 'Cold Call', 'Existing Contact', 'Other',
];
export const NOT_SPECIFIED = 'Not specified';

export const DEFAULT_GROUPS = [
  { id: 'g_interested', name: 'Interested', color: 'violet', collapsed: false },
  { id: 'g_ideal', name: 'Ideal Leads', color: 'green', collapsed: false },
  { id: 'g_leads', name: 'Leads', color: 'slate', collapsed: false },
  { id: 'g_unsure', name: 'Unsure', color: 'amber', collapsed: false },
  { id: 'g_notideal', name: 'Not Ideal', color: 'rose', collapsed: true },
];
const GROUP_BY_NAME = Object.fromEntries(DEFAULT_GROUPS.map((g) => [g.name, g.id]));

// ---- Reusable defaults (shared by every workspace) ----
function defaultKpis() {
  return [
    { id: uid('k'), name: 'DMs sent', target: 20, unit: 'DMs', source: 'auto:dms', period: 'daily', color: 'violet' },
    { id: uid('k'), name: 'New prospects added', target: 10, unit: '', source: 'auto:new', period: 'daily', color: 'green' },
    { id: uid('k'), name: 'Replies received', target: 3, unit: '', source: 'auto:replies', period: 'daily', color: 'blue' },
    { id: uid('k'), name: 'Calls booked', target: 1, unit: '', source: 'manual', period: 'weekly', color: 'amber' },
    { id: uid('k'), name: 'Converted to paid client', target: 1, unit: '', source: 'manual', period: 'weekly', color: 'rose' },
  ];
}
function defaultChecklist() {
  return {
    items: [
      { id: uid('c'), label: 'Sent my minimum number of DMs / follow-ups', type: 'success', period: 'daily' },
      { id: uid('c'), label: 'Replied to every response the same day', type: 'success', period: 'daily' },
      { id: uid('c'), label: 'Grounded myself before starting (prayer / stillness)', type: 'success', period: 'daily' },
      { id: uid('c'), label: 'Cleared every overdue follow-up', type: 'success', period: 'daily' },
      { id: uid('c'), label: 'Sent zero messages today', type: 'failure', period: 'daily' },
      { id: uid('c'), label: 'Left a reply unanswered overnight', type: 'failure', period: 'daily' },
      { id: uid('c'), label: 'Booked at least one call this week', type: 'success', period: 'weekly' },
      { id: uid('c'), label: 'Reviewed the pipeline and tidied stale rows', type: 'success', period: 'weekly' },
    ],
    log: {},
  };
}
function defaultAutomations(interestedId, notIdealId) {
  return [
    { id: uid('a'), name: 'Positive reply → Interested', enabled: true, trigger: { type: 'reply', value: 'positive' }, action: { type: 'move', groupId: interestedId } },
    { id: uid('a'), name: 'Negative reply → Not Ideal', enabled: true, trigger: { type: 'reply', value: 'negative' }, action: { type: 'move', groupId: notIdealId } },
    { id: uid('a'), name: 'All follow-ups sent, no reply → Not Ideal', enabled: false, trigger: { type: 'stage', op: '>=', value: 6 }, action: { type: 'move', groupId: notIdealId } },
  ];
}
function globalSettings() {
  return {
    theme: 'system', operatorName: '', notifications: false, dailyDmCap: 30,
    workdaysOnly: true, jitter: true, autorunAutomations: true, onboarded: false,
    customFields: [], lastBackup: null, autoBackup: false, glassMode: false,
    prospectTypes: [...DEFAULT_PROSPECT_TYPES], leadSources: [...DEFAULT_LEAD_SOURCES],
  };
}

function buildProspect(row, cadenceDays, stageOrder) {
  const stage = row.stage || 0;
  const history = [];
  let followUpDate = row.followUpDate || null;
  if (stage >= 1) {
    const variant = row.importedTemplate ? ((row.importedTemplate - 1) % 3) : 0;
    history.push({ id: uid('h'), date: row.lastInteraction || todayISO(), type: 'sent', stageIndex: 0, stageLabel: stageOrder[0], variant, note: 'Imported from Monday.com' });
    if (!followUpDate) followUpDate = nextWorkday(addDays(row.lastInteraction || todayISO(), cadenceDays[stageOrder[stage]] || 3));
  }
  return {
    id: uid('p'), name: row.name || row.handle || 'Unnamed', handle: row.handle || '',
    service: row.service || '', leadSource: NOT_SPECIFIED,
    groupId: GROUP_BY_NAME[row.group] || GROUP_BY_NAME.Leads,
    stage, replyStatus: row.group === 'Interested' ? 'positive' : 'none',
    followUpDate, lastInteraction: row.lastInteraction || null, notes: row.notes || '',
    archived: false, history, createdAt: todayISO(), importedItemId: row.itemId || '',
    email: '', phone: '', website: '', location: '', propertyNotes: '', tags: [], custom: {},
  };
}

// ---- Workspace builders ----
function barbonWorkspace() {
  const { library, cadenceDays, stageOrder } = SEED_MESSAGES;
  return {
    id: 'ws_barbon', name: 'Barbon Photography', color: 'violet', palette: 'muted-dusk',
    serviceTypes: [...SERVICE_TYPES], suggestedTags: [],
    prospects: SEED_PROSPECTS.map((r) => buildProspect(r, cadenceDays, stageOrder)),
    groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
    messages: { library, cadenceDays, stageOrder },
    kpis: defaultKpis(), kpiLog: {}, checklist: defaultChecklist(),
    automations: defaultAutomations('g_interested', 'g_notideal'), activity: [],
  };
}
function saWorkspace() {
  const groups = [
    { id: 'sa_interested', name: 'Interested', color: 'violet', collapsed: false },
    { id: 'sa_leads', name: 'Leads', color: 'slate', collapsed: false },
    { id: 'sa_contacted', name: 'Contacted', color: 'amber', collapsed: false },
    { id: 'sa_notideal', name: 'Not Ideal', color: 'rose', collapsed: true },
  ];
  return {
    id: 'ws_sa', name: 'SA Management', color: 'blue', palette: 'gumdrop',
    serviceTypes: [...SEED_SA.serviceTypes], suggestedTags: ['Contractors', 'Corporate Guests'],
    prospects: [],
    groups,
    messages: { library: SEED_SA.library, cadenceDays: SEED_SA.cadenceDays, stageOrder: SEED_SA.stageOrder },
    kpis: defaultKpis(), kpiLog: {}, checklist: defaultChecklist(),
    automations: defaultAutomations('sa_interested', 'sa_notideal'), activity: [],
  };
}

// A fresh, minimal workspace for the "+ New workspace" button.
export function blankWorkspace(name, color = 'blue') {
  const groups = [
    { id: uid('g'), name: 'Interested', color: 'violet', collapsed: false },
    { id: uid('g'), name: 'Leads', color: 'slate', collapsed: false },
    { id: uid('g'), name: 'Not Ideal', color: 'rose', collapsed: true },
  ];
  return {
    id: uid('ws'), name, color, palette: 'violet', serviceTypes: [], suggestedTags: [], prospects: [], groups,
    messages: { library: {}, cadenceDays: { 'First DM': 0, 'Follow-up 1': 3, 'Follow-up 2': 5, 'Follow-up 3': 7, 'Follow-up 4': 14, 'Follow-up 5': 16 }, stageOrder: ['First DM', 'Follow-up 1', 'Follow-up 2', 'Follow-up 3', 'Follow-up 4', 'Follow-up 5'] },
    kpis: defaultKpis(), kpiLog: {}, checklist: defaultChecklist(),
    automations: defaultAutomations(groups[0].id, groups[2].id), activity: [],
  };
}

export function buildInitialState() {
  return { version: 3, activeWs: 'ws_barbon', workspaces: [barbonWorkspace(), saWorkspace()], settings: globalSettings() };
}

// ---- Migrations ----
export function migrateToV2(v1) {
  const barbon = {
    id: 'ws_barbon', name: 'Barbon Photography', color: 'violet', palette: 'muted-dusk',
    serviceTypes: [...SERVICE_TYPES], suggestedTags: [],
    prospects: (v1.prospects || []).map((p) => ({ email: '', phone: '', website: '', location: '', propertyNotes: '', tags: [], custom: {}, ...p, tags: Array.isArray(p.tags) ? p.tags : [], custom: p.custom || {}, history: p.history || [] })),
    groups: v1.groups || DEFAULT_GROUPS.map((g) => ({ ...g })),
    messages: v1.messages || { library: SEED_MESSAGES.library, cadenceDays: SEED_MESSAGES.cadenceDays, stageOrder: SEED_MESSAGES.stageOrder },
    kpis: v1.kpis || defaultKpis(), kpiLog: v1.kpiLog || {},
    checklist: v1.checklist || defaultChecklist(),
    automations: v1.automations || defaultAutomations('g_interested', 'g_notideal'),
    activity: v1.activity || [],
  };
  const settings = { ...globalSettings(), ...(v1.settings || {}) };
  settings.customFields = Array.isArray(settings.customFields) ? settings.customFields : [];
  return { version: 2, activeWs: 'ws_barbon', workspaces: [barbon, saWorkspace()], settings };
}

// Section names that are really a Lead Source or a Group, not a pipeline stage.
const SECTION_TO_SOURCE = {
  'networking events': 'Networking Event', 'networking event': 'Networking Event',
  'physical walk-ins': 'Physical Walk-in', 'physical walk-in': 'Physical Walk-in',
  'walk-ins': 'Physical Walk-in', 'walk-in': 'Physical Walk-in', 'walk in': 'Physical Walk-in',
};
const SECTION_TO_GROUP = new Set(['event space', 'prime, super prime, mansions & castles']);

// v2 -> v3: introduce Lead Source, promote Groups (tags), and auto-sort the
// sections that were really Lead Sources / Groups out of the Pipeline Stages.
export function migrateToV3(s) {
  const types = new Set(DEFAULT_PROSPECT_TYPES);
  (s.workspaces || []).forEach((w) => {
    (w.serviceTypes || []).forEach((t) => types.add(t));
    (w.prospects || []).forEach((p) => { if (p.service) types.add(p.service); });
  });

  for (const w of (s.workspaces || [])) {
    const sourceSecs = {}; const groupSecs = {};
    (w.groups || []).forEach((sec) => {
      const k = (sec.name || '').trim().toLowerCase();
      if (SECTION_TO_SOURCE[k]) sourceSecs[sec.id] = SECTION_TO_SOURCE[k];
      else if (SECTION_TO_GROUP.has(k)) groupSecs[sec.id] = sec.name;
    });
    const remaining = (w.groups || []).filter((sec) => !sourceSecs[sec.id] && !groupSecs[sec.id]);
    const leadsSec = remaining.find((sec) => (sec.name || '').trim().toLowerCase() === 'leads') || remaining[0];
    const defaultStageId = leadsSec ? leadsSec.id : ((w.groups[0] || {}).id);
    (w.prospects || []).forEach((p) => {
      if (!p.leadSource) p.leadSource = NOT_SPECIFIED;
      if (!Array.isArray(p.tags)) p.tags = [];
      if (sourceSecs[p.groupId]) { p.leadSource = sourceSecs[p.groupId]; p.groupId = defaultStageId; }
      else if (groupSecs[p.groupId]) { p.tags = [...new Set([...p.tags, groupSecs[p.groupId]])]; p.groupId = defaultStageId; }
    });
    w.groups = remaining;
    const movedGroups = Object.values(groupSecs);
    if (movedGroups.length) w.suggestedTags = [...new Set([...(w.suggestedTags || []), ...movedGroups])];
  }

  s.settings = s.settings || {};
  if (!Array.isArray(s.settings.prospectTypes) || !s.settings.prospectTypes.length) s.settings.prospectTypes = [...types];
  if (!Array.isArray(s.settings.leadSources) || !s.settings.leadSources.length) s.settings.leadSources = [...DEFAULT_LEAD_SOURCES];
  s.version = 3;
  return s;
}

// Bring any older saved state up to the current version.
export function migrateToLatest(saved) {
  let s = saved;
  if (s.version === 1 || (Array.isArray(s.prospects) && !s.version)) s = migrateToV2(s);
  if (s.version === 2) s = migrateToV3(s);
  return s;
}
