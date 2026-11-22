import { html, useState } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Pill, SectionCard, serviceColor } from '../components/ui.js';
import { useStore } from '../store.js';
import { weekStart } from '../logic.js';
import { todayISO, addDays, parseISO } from '../util.js';

const WON_RE = /paid|client|won|closed/i;

function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

// Funnel from robust signals (independent of user-named stages).
function funnel(prospects, groups) {
  const wonStageIds = new Set(groups.filter((g) => WON_RE.test(g.name)).map((g) => g.id));
  const active = prospects.filter((p) => !p.archived);
  const total = active.length;
  const contacted = active.filter((p) => (p.stage || 0) >= 1 || (p.history || []).some((h) => h.type === 'sent')).length;
  const replied = active.filter((p) => p.replyStatus && p.replyStatus !== 'none').length;
  const interested = active.filter((p) => p.replyStatus === 'positive').length;
  const clients = active.filter((p) => wonStageIds.has(p.groupId)).length;
  return { total, contacted, replied, interested, clients };
}

// Breakdown by a field: total + interested + contacted, sorted by total desc.
function breakdown(prospects, pick) {
  const m = {};
  prospects.filter((p) => !p.archived).forEach((p) => {
    const k = pick(p) || 'Not specified';
    const row = m[k] || (m[k] = { key: k, total: 0, contacted: 0, interested: 0 });
    row.total++;
    if ((p.stage || 0) >= 1) row.contacted++;
    if (p.replyStatus === 'positive') row.interested++;
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}

// Selectable ranges; granularity adapts so charts stay readable.
export const RANGES = [
  { value: '7d', label: 'Last 7 days', days: 7, gran: 'day' },
  { value: '30d', label: 'Last 30 days', days: 30, gran: 'day' },
  { value: '90d', label: 'Last 3 months', days: 91, gran: 'week' },
  { value: '6m', label: 'Last 6 months', days: 182, gran: 'week' },
  { value: '12m', label: 'Last 12 months', days: 365, gran: 'month' },
  { value: 'all', label: 'All time', days: null, gran: 'month' },
];
function shortLabel(iso) { const d = parseISO(iso); return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; }
function monthLabel(ym) { const d = parseISO(ym + '-01'); return d ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : ym; }
function addMonth(ym) { let [y, m] = ym.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; }

// Activity buckets over a range, tallying sent / reply / added.
function buildTrend(activity, r) {
  const today = todayISO();
  let start;
  if (r.days) start = addDays(today, -(r.days - 1));
  else { const ds = activity.map((a) => a.date).filter(Boolean).sort(); start = (ds[0] || addDays(today, -365)); }
  const buckets = []; const idx = {};
  if (r.gran === 'day') {
    let d = start; let guard = 0;
    while (d <= today && guard++ < 400) { idx[d] = buckets.length; buckets.push({ key: d, label: shortLabel(d), sent: 0, reply: 0, added: 0 }); d = addDays(d, 1); }
  } else if (r.gran === 'week') {
    let d = weekStart(start); let guard = 0;
    while (d <= today && guard++ < 200) { idx[d] = buckets.length; buckets.push({ key: d, label: shortLabel(d), sent: 0, reply: 0, added: 0 }); d = addDays(d, 7); }
  } else {
    let ym = start.slice(0, 7); const endYM = today.slice(0, 7); let guard = 0;
    while (guard++ < 120) { idx[ym] = buckets.length; buckets.push({ key: ym, label: monthLabel(ym), sent: 0, reply: 0, added: 0 }); if (ym === endYM) break; ym = addMonth(ym); }
  }
  activity.forEach((a) => {
    if (!a.date || a.date < start.slice(0, 10)) return;
    const key = r.gran === 'day' ? a.date : r.gran === 'week' ? weekStart(a.date) : a.date.slice(0, 7);
    const i = idx[key]; if (i === undefined) return;
    const b = buckets[i];
    if (a.type === 'sent') b.sent++; else if (a.type === 'reply') b.reply++; else if (a.type === 'added') b.added++;
  });
  return buckets;
}

function FunnelBar({ label, value, base, color }) {
  return html`<div class="funnel-step">
    <div class="funnel-meta"><span>${label}</span><span class="kpi-val"><b>${value}</b> · ${pct(value, base)}%</span></div>
    <div class="funnel-track"><div class=${'funnel-fill bg-' + color} style=${`width:${Math.max(2, pct(value, base))}%`}></div></div>
  </div>`;
}

function niceCeil(v) {
  if (v <= 4) return Math.max(1, v);
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p; const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * p;
}

// Grouped bar chart: 3 bars (Sent / Replies / New) per period, with a value
// Y-axis + gridlines, dated X-axis labels, and a hover tooltip.
function TrendChart({ buckets }) {
  const [hover, setHover] = useState(-1);
  const SERIES = [['sent', 'violet', 'Sent'], ['reply', 'green', 'Replies'], ['added', 'blue', 'New']];
  const n = Math.max(1, buckets.length);
  const rawMax = Math.max(1, ...buckets.flatMap((b) => [b.sent, b.reply, b.added]));
  const niceMax = niceCeil(rawMax);
  const step = niceMax <= 4 ? 1 : niceMax / 4;
  const tickVals = []; for (let v = 0; v <= niceMax + 1e-6; v += step) tickVals.push(Math.round(v));

  const W = 680, H = 190, ml = 26, mr = 6, mt = 8, mb = 24;
  const plotW = W - ml - mr, plotH = H - mt - mb;
  const groupW = plotW / n;
  const bw = Math.max(2, Math.min(11, (groupW - 6) / 3));
  const y = (v) => mt + plotH - (v / niceMax) * plotH;
  const labelEvery = Math.ceil(n / 8);
  const h = hover >= 0 && hover < buckets.length ? buckets[hover] : null;

  return html`<div class="chart-wrap" onMouseLeave=${() => setHover(-1)}>
    <svg viewBox=${`0 0 ${W} ${H}`} width="100%" style="display:block;overflow:visible">
      <!-- gridlines + y ticks -->
      ${tickVals.map((tv) => html`<g>
        <line x1=${ml} x2=${W - mr} y1=${y(tv)} y2=${y(tv)} stroke="var(--border)" stroke-width="1" />
        <text x=${ml - 5} y=${y(tv) + 3} text-anchor="end" font-size="9" fill="var(--muted)">${tv}</text>
      </g>`)}
      <!-- bars -->
      ${buckets.map((b, i) => {
        const gx = ml + groupW * i + (groupW - bw * 3) / 2;
        return html`<g key=${i}>
          ${SERIES.map(([key, color], s) => {
            const bh = (b[key] / niceMax) * plotH;
            return html`<rect x=${gx + s * bw} y=${y(b[key])} width=${Math.max(1.5, bw - 1)} height=${Math.max(0, bh)} rx="1" fill=${`rgb(var(--pc-${color}))`} opacity=${hover === -1 || hover === i ? 1 : 0.35} />`;
          })}
          <rect x=${ml + groupW * i} y=${mt} width=${groupW} height=${plotH} fill="transparent" onMouseEnter=${() => setHover(i)} />
        </g>`;
      })}
      <!-- x labels (thinned) -->
      ${buckets.map((b, i) => (i % labelEvery === 0 || i === n - 1)
        ? html`<text x=${ml + groupW * i + groupW / 2} y=${H - 8} text-anchor="middle" font-size="9" fill="var(--muted)">${b.label}</text>` : null)}
    </svg>
    ${h && html`<div class="chart-tip" style=${`left:${((ml + groupW * (hover + 0.5)) / W) * 100}%`}>
      <div class="chart-tip-date">${h.label}</div>
      ${SERIES.map(([key, color, lbl]) => html`<div class="chart-tip-row"><span class="dot dot-${color}"></span>${lbl}<b>${h[key]}</b></div>`)}
    </div>`}
    <div class="wrap-flex" style="gap:14px;font-size:12px;margin-top:8px">
      <span class="row-flex"><span class="dot dot-violet"></span> Sent</span>
      <span class="row-flex"><span class="dot dot-green"></span> Replies</span>
      <span class="row-flex"><span class="dot dot-blue"></span> New prospects</span>
    </div>
  </div>`;
}

export function AnalyticsView() {
  const state = useStore();
  const f = funnel(state.prospects, state.groups);
  const byType = breakdown(state.prospects, (p) => p.service);
  const bySource = breakdown(state.prospects, (p) => p.leadSource);
  const [rangeVal, setRangeVal] = useState('90d');
  const range = RANGES.find((r) => r.value === rangeVal) || RANGES[2];
  const buckets = buildTrend(state.activity, range);
  const totalSent = buckets.reduce((n, b) => n + b.sent, 0);
  const totalReplies = buckets.reduce((n, b) => n + b.reply, 0);

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">📈</span> Insights</h1>
      <${Pill} color=${state.wsColor || 'violet'}>${state.wsName}<//>
      <div class="spacer"></div>
    </div>
    <div class="view"><div class="view-inner">

      <div class="stat-row">
        <div class="stat"><div class="lbl">Total prospects</div><div class="val">${f.total}</div><div class="sub">${f.contacted} contacted</div></div>
        <div class="stat"><div class="lbl">Reply rate</div><div class="val">${pct(f.replied, f.contacted)}%</div><div class="sub">${f.replied} of ${f.contacted} contacted</div></div>
        <div class="stat"><div class="lbl">Interested</div><div class="val">${f.interested}</div><div class="sub">${pct(f.interested, f.contacted)}% of contacted</div></div>
        <div class="stat"><div class="lbl">Clients won</div><div class="val">${f.clients}</div><div class="sub">${pct(f.clients, f.total)}% of all</div></div>
      </div>

      <div class="grid grid-2 mt-16">
        <${SectionCard} title=${html`<span class="row-flex"><${Icon} name="funnel" size=16 /> Conversion funnel</span>`}>
          <${FunnelBar} label="All prospects" value=${f.total} base=${f.total} color="slate" />
          <${FunnelBar} label="Contacted" value=${f.contacted} base=${f.total} color="violet" />
          <${FunnelBar} label="Replied" value=${f.replied} base=${f.total} color="blue" />
          <${FunnelBar} label="Interested" value=${f.interested} base=${f.total} color="amber" />
          <${FunnelBar} label="Clients won" value=${f.clients} base=${f.total} color="green" />
          <p class="muted" style="font-size:12px;margin-top:10px">“Clients won” counts prospects in any stage named like Paid / Client / Won. Rename a stage to match if needed.</p>
        <//>

        <${SectionCard} title=${html`<span class="row-flex"><${Icon} name="chart" size=16 /> Activity</span>`}
          right=${html`<select class="input select" style="width:auto;padding:5px 26px 5px 9px;font-size:12.5px" value=${rangeVal} onChange=${(e) => setRangeVal(e.target.value)}>
            ${RANGES.map((r) => html`<option value=${r.value}>${r.label}</option>`)}
          </select>`}>
          <${TrendChart} buckets=${buckets} />
          <div class="wrap-flex mt-16" style="border-top:1px solid var(--border);padding-top:12px">
            <div class="stat" style="border:none;padding:0;flex:1"><div class="lbl">Sends</div><div class="val" style="font-size:20px">${totalSent}</div></div>
            <div class="stat" style="border:none;padding:0;flex:1"><div class="lbl">Replies</div><div class="val" style="font-size:20px">${totalReplies}</div></div>
            <div class="stat" style="border:none;padding:0;flex:1"><div class="lbl">Reply rate</div><div class="val" style="font-size:20px">${pct(totalReplies, totalSent)}%</div></div>
          </div>
        <//>
      </div>

      <div class="grid grid-2 mt-16">
        <${SectionCard} title="By Lead Source" right=${html`<span class="muted" style="font-size:12px">which sources convert</span>`}>
          <${BreakdownTable} rows=${bySource} />
        <//>
        <${SectionCard} title="By Prospect Type" right=${html`<span class="muted" style="font-size:12px">where the interest is</span>`}>
          <${BreakdownTable} rows=${byType} colorize=${true} />
        <//>
      </div>
    </div></div>
  </div>`;
}

function BreakdownTable({ rows, colorize }) {
  if (!rows.length) return html`<p class="muted" style="font-size:13px">No data yet.</p>`;
  const max = Math.max(...rows.map((r) => r.total));
  return html`<div>
    <div class="bd-head"><span>Segment</span><span>Total</span><span>Contacted</span><span>Interested</span></div>
    ${rows.slice(0, 10).map((r) => html`<div class="bd-row" key=${r.key}>
      <span class="bd-name">${colorize && r.key !== 'Not specified' ? html`<${Pill} color=${serviceColor(r.key)}>${r.key}<//>` : r.key}</span>
      <span><b>${r.total}</b><span class="bd-bar"><span class="bd-bar-fill" style=${`width:${pct(r.total, max)}%`}></span></span></span>
      <span class="muted">${r.contacted}</span>
      <span>${r.interested} <span class="muted">(${pct(r.interested, r.total)}%)</span></span>
    </div>`)}
  </div>`;
}
