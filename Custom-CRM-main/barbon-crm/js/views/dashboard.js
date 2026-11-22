import { html } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, Pill, ProgressBar, Avatar, SectionCard, StatusDot } from '../components/ui.js';
import { useStore } from '../store.js';
import { kpiProgress, todayQueue, streak, dayScore } from '../logic.js';
import { quoteForDay } from '../quotes.js';
import { todayISO, addDays, fmtRelative, firstName } from '../util.js';

// Count prospects by a field, return top entries sorted desc.
function tally(list, pick) {
  const m = {};
  list.forEach((p) => { const k = pick(p) || 'Not specified'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardView({ onOpen, onSend, navigate }) {
  const state = useStore();
  const today = todayISO();
  const quote = quoteForDay(today);
  const { due, fresh } = todayQueue(state, today);
  const dailyKpis = state.kpis.filter((k) => k.period === 'daily');
  const weeklyKpis = state.kpis.filter((k) => k.period === 'weekly');
  const sc = dayScore(state, today);
  const str = streak(state);
  const interested = state.prospects.filter((p) => p.replyStatus === 'positive' && !p.archived).length;
  const sentToday = state.activity.filter((a) => a.type === 'sent' && a.date === today).length;
  const name = firstName(state.settings.operatorName);

  const weekAgo = addDays(today, -6);
  const newThisWeek = state.prospects.filter((p) => !p.archived && p.createdAt && p.createdAt >= weekAgo);
  const byType = tally(newThisWeek, (p) => p.service);
  const bySource = tally(newThisWeek, (p) => p.leadSource);

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">🏠</span> ${greeting()}${name ? ', ' + name : ''}</h1>
      <${Pill} color=${state.wsColor || 'violet'}>${state.wsName}<//>
      <div class="spacer"></div>
      <span class="muted" style="font-size:13px">${dateStr}</span>
    </div>

    <div class="view"><div class="view-inner">
      <!-- Hero: purpose + at a glance -->
      <div class="dash-hero">
        <div class="hero-quote">
          <div class="q-icon"><${Icon} name="quote" size=22 /></div>
          <blockquote>${quote.text}</blockquote>
          <div class="q-src">— ${quote.source} <${Pill} color="violet">${quote.tag}<//></div>
        </div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;margin:0">
          <div class="stat"><div class="lbl">Follow-ups due</div><div class="val">${due.length}</div><div class="sub">${fresh.length} fresh to contact</div></div>
          <div class="stat"><div class="lbl">Sent today</div><div class="val">${sentToday}</div><div class="sub">cap ${state.settings.dailyDmCap}</div></div>
          <div class="stat"><div class="lbl">Interested</div><div class="val">${interested}</div><div class="sub">warm conversations</div></div>
          <div class="stat"><div class="lbl">Win streak</div><div class="val">${str} <span style="font-size:16px">${str > 0 ? '🔥' : ''}</span></div><div class="sub">days honoured</div></div>
        </div>
      </div>

      <div class="grid grid-2">
        <!-- KPIs -->
        <${SectionCard} title=${'Today’s targets'} right=${html`<${Button} size="sm" variant="ghost" icon="target" onClick=${() => navigate('kpis')}>Manage<//>`}>
          ${dailyKpis.length === 0 && html`<p class="muted">No daily KPIs yet.</p>`}
          ${dailyKpis.map((k) => {
            const pr = kpiProgress(state, k, today);
            return html`<div class="kpi-item" key=${k.id}>
              <div class="kpi-top">
                <span class="kpi-name"><${StatusDot} color=${k.color} /> ${k.name}</span>
                <span class="kpi-val"><b>${pr.value}</b> / ${k.target} ${k.unit} ${pr.hit ? '✓' : ''}</span>
              </div>
              <${ProgressBar} pct=${pr.pct} color=${pr.hit ? 'green' : k.color} />
            </div>`;
          })}
          ${weeklyKpis.length > 0 && html`<div class="mt-16" style="border-top:1px solid var(--border);padding-top:8px">
            <div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:6px">This week</div>
            ${weeklyKpis.map((k) => {
              const pr = kpiProgress(state, k, today);
              return html`<div class="kpi-item" key=${k.id}>
                <div class="kpi-top"><span class="kpi-name"><${StatusDot} color=${k.color} /> ${k.name}</span>
                  <span class="kpi-val"><b>${pr.value}</b> / ${k.target}</span></div>
                <${ProgressBar} pct=${pr.pct} color=${pr.hit ? 'green' : k.color} /></div>`;
            })}
          </div>`}
        <//>

        <!-- Due follow-ups -->
        <${SectionCard} title=${'Due follow-ups'} right=${html`<${Button} size="sm" variant="ghost" icon="today" onClick=${() => navigate('today')}>Today view<//>`}>
          ${due.length === 0 && html`<div class="empty" style="padding:24px"><div class="empty-icon"><${Icon} name="check" size=24 /></div><h4>All caught up</h4><p>No follow-ups due. ${fresh.length} fresh prospects ready when you are.</p></div>`}
          ${due.slice(0, 7).map((p) => html`<div class="due-list-item" key=${p.id}>
            <${Avatar} name=${p.name} handle=${p.handle} />
            <div class="grow" onClick=${() => onOpen(p.id)} style="cursor:pointer">
              <div class="nm">${p.name}</div>
              <div class="due-meta">${p.service || 'No service'} · <span class="due-tag ${'overdue'}">${fmtRelative(p.followUpDate)}</span></div>
            </div>
            <${Button} size="sm" icon="message" onClick=${() => onSend(p.id)}>Send<//>
          </div>`)}
          ${due.length > 7 && html`<button class="btn btn-ghost btn-sm mt-8" onClick=${() => navigate('today')}>+${due.length - 7} more in Today view</button>`}
        <//>
      </div>

      <!-- New this week: breakdown by type + source -->
      <div class="mt-16">
        <${SectionCard} title=${html`New this week <span class="group-count">${newThisWeek.length}</span>`} right=${html`<${Button} size="sm" variant="ghost" icon="table" onClick=${() => navigate('pipeline')}>Pipeline<//>`}>
          ${newThisWeek.length === 0 && html`<p class="muted" style="font-size:13px">No new prospects added in the last 7 days.</p>`}
          ${newThisWeek.length > 0 && html`<div class="grid grid-2">
            <div>
              <div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:8px">By prospect type</div>
              ${byType.slice(0, 6).map(([k, n]) => html`<div class="breakdown-row"><span>${k}</span><b>${n}</b></div>`)}
            </div>
            <div>
              <div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:8px">By lead source</div>
              ${bySource.slice(0, 6).map(([k, n]) => html`<div class="breakdown-row"><span>${k}</span><b>${n}</b></div>`)}
            </div>
          </div>`}
        <//>
      </div>

      <!-- Checklist snapshot -->
      <div class="mt-16">
        <${SectionCard} title=${'Today’s standard'} right=${html`<${Button} size="sm" variant="ghost" icon="checklist" onClick=${() => navigate('checklist')}>Open checklist<//>`}>
          <div class="wrap-flex" style="justify-content:space-between">
            <div class="row-flex">
              ${sc.verdict === 'win' ? html`<${Pill} color="green">Winning day<//>`
                : sc.verdict === 'fail' ? html`<${Pill} color="rose">Off standard<//>`
                : sc.verdict === 'partial' ? html`<${Pill} color="amber">In progress<//>`
                : html`<${Pill} color="slate">Not logged yet<//>`}
              <span class="muted">${sc.successHit}/${sc.successTotal} success habits checked</span>
            </div>
            <${Button} size="sm" onClick=${() => navigate('checklist')}>Check in<//>
          </div>
        <//>
      </div>
    </div></div>
  </div>`;
}
