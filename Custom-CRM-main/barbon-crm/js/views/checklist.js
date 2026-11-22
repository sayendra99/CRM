import { html, useState } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Modal, Field, Select, SectionCard } from '../components/ui.js';
import { toast } from '../components/toast.js';
import { useStore, toggleChecklist, addChecklistItem, removeChecklistItem } from '../store.js';
import { dayScore, streak } from '../logic.js';
import { todayISO, addDays, fmtDate, parseISO, toISO } from '../util.js';

function CheckLine({ item, date, checked }) {
  const isFail = item.type === 'failure';
  return html`<div class="check-line">
    <button class=${'check-box ' + (isFail ? 'fail ' : '') + (checked ? 'done' : '')} onClick=${() => toggleChecklist(date, item.id)}>
      <${Icon} name=${isFail ? 'x' : 'check'} size=15 />
    </button>
    <span style=${'flex:1' + (checked && !isFail ? ';color:var(--muted);text-decoration:line-through' : '')}>${item.label}</span>
    ${isFail && html`<${Pill} color="rose">failure<//>`}
    <${IconButton} name="trash" size=14 title="Remove" onClick=${() => { if (confirm('Remove this item?')) removeChecklistItem(item.id); }} />
  </div>`;
}

function AddItem({ onClose }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('success');
  const [period, setPeriod] = useState('daily');
  return html`<${Modal} title="Add checklist item" onClose=${onClose}
    footer=${html`<${Button} variant="ghost" onClick=${onClose}>Cancel<//><${Button} variant="primary" onClick=${() => { if (!label.trim()) return; addChecklistItem({ label, type, period }); toast('Added'); onClose(); }}>Add<//>`}>
    <${Field} label="What does it look like?"><input class="input" value=${label} onInput=${(e) => setLabel(e.target.value)} placeholder="e.g. Sent 20 thoughtful DMs" /><//>
    <div class="grid grid-2">
      <${Field} label="Type"><${Select} value=${type} onChange=${setType} options=${[{ value: 'success', label: 'Success habit' }, { value: 'failure', label: 'Failure signal' }]} /><//>
      <${Field} label="Cadence"><${Select} value=${period} onChange=${setPeriod} options=${[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} /><//>
    </div>
  <//>`;
}

export function ChecklistView() {
  const state = useStore();
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);
  const log = state.checklist.log[date] || {};
  const daily = state.checklist.items.filter((i) => i.period === 'daily');
  const weekly = state.checklist.items.filter((i) => i.period === 'weekly');
  const successItems = daily.filter((i) => i.type === 'success');
  const failItems = daily.filter((i) => i.type === 'failure');
  const sc = dayScore(state, date);
  const str = streak(state);

  // Heatmap: last 119 days + today.
  const cells = [];
  let d = addDays(todayISO(), -119);
  for (let i = 0; i < 120; i++) { cells.push(d); d = addDays(d, 1); }
  const wins = cells.filter((c) => dayScore(state, c).verdict === 'win').length;
  const logged = cells.filter((c) => dayScore(state, c).anyLogged).length;

  const isToday = date === todayISO();
  const dLabel = new Date(parseISO(date)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">✅</span> Standard</h1>
      <div class="spacer"></div>
      <${Button} variant="primary" size="sm" icon="plus" onClick=${() => setAdding(true)}>Add item<//>
    </div>
    <div class="view"><div class="view-inner">
      <div class="grid grid-2 mb-16">
        <${SectionCard} title=${html`<div class="row-flex"><${IconButton} name="chevronLeft" onClick=${() => setDate(addDays(date, -1))} /> <span>${isToday ? 'Today' : dLabel}</span> ${!isToday && html`<${IconButton} name="chevronRight" onClick=${() => setDate(addDays(date, 1))} />`}</div>`}
          right=${sc.verdict === 'win' ? html`<${Pill} color="green">Winning day<//>` : sc.verdict === 'fail' ? html`<${Pill} color="rose">Off standard<//>` : sc.verdict === 'partial' ? html`<${Pill} color="amber">In progress<//>` : html`<${Pill} color="slate">Not logged<//>`}>
          <div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:4px">A successful day</div>
          ${successItems.map((i) => html`<${CheckLine} key=${i.id} item=${i} date=${date} checked=${!!log[i.id]} />`)}
          ${failItems.length > 0 && html`<div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin:14px 0 4px">Failure looks like</div>`}
          ${failItems.map((i) => html`<${CheckLine} key=${i.id} item=${i} date=${date} checked=${!!log[i.id]} />`)}
        <//>

        <div>
          <div class="stat-row" style="grid-template-columns:1fr 1fr;margin-bottom:16px">
            <div class="stat"><div class="lbl">Win streak</div><div class="val">${str} ${str > 0 ? '🔥' : ''}</div><div class="sub">consecutive winning days</div></div>
            <div class="stat"><div class="lbl">Win rate (120d)</div><div class="val">${logged ? Math.round((wins / logged) * 100) : 0}%</div><div class="sub">${wins} wins of ${logged} logged</div></div>
          </div>
          ${weekly.length > 0 && html`<${SectionCard} title="This week">
            ${weekly.map((i) => html`<${CheckLine} key=${i.id} item=${i} date=${date} checked=${!!log[i.id]} />`)}
          <//>`}
        </div>
      </div>

      <${SectionCard} title=${'Track record'}>
        <div class="heatmap">
          ${cells.map((c) => {
            const v = dayScore(state, c).verdict;
            const cls = v === 'win' ? 'heat-win' : v === 'partial' ? 'heat-partial' : v === 'fail' ? 'heat-fail' : '';
            return html`<div class=${'heat-cell ' + cls} title=${fmtDate(c) + ' — ' + (v === 'none' ? 'not logged' : v)}></div>`;
          })}
        </div>
        <div class="wrap-flex mt-16" style="font-size:12px" >
          <span class="row-flex"><span class="heat-cell heat-win"></span> Win</span>
          <span class="row-flex"><span class="heat-cell heat-partial"></span> Partial</span>
          <span class="row-flex"><span class="heat-cell heat-fail"></span> Off standard</span>
          <span class="row-flex"><span class="heat-cell"></span> Not logged</span>
        </div>
      <//>
    </div></div>
    ${adding && html`<${AddItem} onClose=${() => setAdding(false)} />`}
  </div>`;
}
