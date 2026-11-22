// Pure, read-only derivations used by views. No mutations here.
import { todayISO, parseISO, toISO, daysBetween } from './util.js';

export function weekStart(iso) {
  const d = parseISO(iso) || new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toISO(d);
}
export function weekDates(iso) {
  const start = weekStart(iso);
  const out = [];
  const d = parseISO(start);
  for (let i = 0; i < 7; i++) { out.push(toISO(d)); d.setDate(d.getDate() + 1); }
  return out;
}

// ---- KPI values ----
// Auto KPIs are computed from the activity feed; manual KPIs from kpiLog.
export function kpiValue(state, kpi, date = todayISO()) {
  if (kpi.source && kpi.source.startsWith('auto:')) {
    const kind = kpi.source.split(':')[1]; // dms | replies | new
    const typeMap = { dms: 'sent', replies: 'reply', new: 'added' };
    const wantType = typeMap[kind];
    const inPeriod = periodFilter(kpi.period, date);
    return state.activity.filter((a) => a.type === wantType && inPeriod(a.date)).length;
  }
  // manual
  if (kpi.period === 'weekly') {
    return weekDates(date).reduce((sum, d) => sum + ((state.kpiLog[d] || {})[kpi.id] || 0), 0);
  }
  return (state.kpiLog[date] || {})[kpi.id] || 0;
}
function periodFilter(period, date) {
  if (period === 'weekly') {
    const set = new Set(weekDates(date));
    return (d) => set.has(d);
  }
  return (d) => d === date;
}

export function kpiProgress(state, kpi, date = todayISO()) {
  const value = kpiValue(state, kpi, date);
  const pct = kpi.target > 0 ? Math.min(100, Math.round((value / kpi.target) * 100)) : 0;
  return { value, pct, hit: value >= kpi.target };
}

// ---- Due / Today ----
export function isDue(prospect, date = todayISO()) {
  if (prospect.archived) return false;
  if (prospect.stage === 0) return false; // handled as "to contact"
  if (!prospect.followUpDate) return false;
  return daysBetween(date, prospect.followUpDate) <= 0; // due today or overdue
}
export function isOverdue(prospect, date = todayISO()) {
  return isDue(prospect, date) && daysBetween(date, prospect.followUpDate) < 0;
}
export function isNew(prospect) {
  return !prospect.archived && prospect.stage === 0;
}

// Ordered work queue for the Today view: overdue first, then due, then fresh.
export function todayQueue(state, date = todayISO()) {
  const groupRank = Object.fromEntries(state.groups.map((g, i) => [g.id, i]));
  const active = state.prospects.filter((p) => !p.archived && p.replyStatus !== 'positive');
  const due = active.filter((p) => isDue(p, date));
  const fresh = active.filter((p) => isNew(p));
  const rank = (p) => (groupRank[p.groupId] ?? 99);
  due.sort((a, b) => daysBetween(date, a.followUpDate) - daysBetween(date, b.followUpDate) || rank(a) - rank(b));
  fresh.sort((a, b) => rank(a) - rank(b) || (b.service ? 1 : 0) - (a.service ? 1 : 0));
  return { due, fresh };
}

export function dueCount(state, date = todayISO()) {
  return state.prospects.filter((p) => isDue(p, date)).length;
}

// ---- Variant suggestion: rotate 0→1→2, never repeat what was sent to this person ----
export function variantsFor(state, service, stageLabel) {
  const svc = state.messages.library[service] || firstServiceLib(state);
  return (svc && svc[stageLabel]) || [''];
}
function firstServiceLib(state) {
  const key = Object.keys(state.messages.library)[0];
  return state.messages.library[key];
}
export function nextStageLabel(state, prospect) {
  const { stageOrder } = state.messages;
  return prospect.stage < stageOrder.length ? stageOrder[prospect.stage] : null;
}
export function suggestVariant(state, prospect) {
  const label = nextStageLabel(state, prospect);
  if (!label) return { label: null, variant: 0, text: '' };
  const service = prospect.service || Object.keys(state.messages.library)[0];
  const variants = variantsFor(state, service, label);
  const usedAtStage = prospect.history
    .filter((h) => h.type === 'sent' && h.stageIndex === prospect.stage)
    .map((h) => h.variant);
  let idx = 0;
  for (let i = 0; i < variants.length; i++) { if (!usedAtStage.includes(i)) { idx = i; break; } }
  // rotate across the whole pipeline so consecutive prospects don't get the same one
  const totalSent = prospect.history.filter((h) => h.type === 'sent').length;
  if (usedAtStage.length === 0) idx = totalSent % variants.length;
  return { label, service, variant: idx, text: variants[idx] || '' };
}

// ---- Checklist scoring ----
export function dayScore(state, date) {
  const log = state.checklist.log[date] || {};
  const daily = state.checklist.items.filter((i) => i.period === 'daily');
  const success = daily.filter((i) => i.type === 'success');
  const failure = daily.filter((i) => i.type === 'failure');
  const successHit = success.filter((i) => log[i.id]).length;
  const failureHit = failure.filter((i) => log[i.id]).length;
  const anyLogged = Object.values(log).some(Boolean);
  let verdict = 'none';
  if (anyLogged) {
    if (failureHit > 0) verdict = 'fail';
    else if (successHit >= Math.ceil(success.length * 0.75)) verdict = 'win';
    else verdict = 'partial';
  }
  return { successHit, successTotal: success.length, failureHit, verdict, anyLogged };
}
export function streak(state, date = todayISO()) {
  let count = 0;
  let d = date;
  for (let i = 0; i < 400; i++) {
    const s = dayScore(state, d);
    if (s.verdict === 'win') { count++; d = shift(d, -1); } else break;
  }
  return count;
}
function shift(iso, n) {
  const dt = parseISO(iso); dt.setDate(dt.getDate() + n); return toISO(dt);
}

// ---- Group stats ----
export function groupStats(state) {
  const out = {};
  for (const g of state.groups) out[g.id] = { total: 0, due: 0 };
  const today = todayISO();
  for (const p of state.prospects) {
    if (p.archived) continue;
    const s = out[p.groupId];
    if (!s) continue;
    s.total++;
    if (isDue(p, today)) s.due++;
  }
  return out;
}
