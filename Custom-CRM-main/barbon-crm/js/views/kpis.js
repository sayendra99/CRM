import { html, useState } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, ProgressBar, StatusDot, Modal, Field, Select, SectionCard } from '../components/ui.js';
import { toast } from '../components/toast.js';
import { useStore, addKpi, updateKpi, deleteKpi, logKpi } from '../store.js';
import { kpiProgress } from '../logic.js';
import { todayISO } from '../util.js';

const SOURCES = [
  { value: 'manual', label: 'Manual — I tap to log it' },
  { value: 'auto:dms', label: 'Automatic — DMs / follow-ups sent' },
  { value: 'auto:replies', label: 'Automatic — replies received' },
  { value: 'auto:new', label: 'Automatic — new prospects added' },
];
const COLORS = ['violet', 'green', 'blue', 'amber', 'rose', 'teal', 'slate'];

function KpiForm({ kpi, onClose }) {
  const [f, setF] = useState(kpi || { name: '', target: 10, unit: '', period: 'daily', source: 'manual', color: 'violet' });
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = () => {
    if (!f.name.trim()) { toast('Name it first', 'x'); return; }
    const data = { ...f, target: Number(f.target) || 0 };
    if (kpi) updateKpi(kpi.id, data); else addKpi(data);
    toast(kpi ? 'KPI updated' : 'KPI added');
    onClose();
  };
  return html`<${Modal} title=${kpi ? 'Edit KPI' : 'New KPI'} onClose=${onClose}
    footer=${html`<${Button} variant="ghost" onClick=${onClose}>Cancel<//><${Button} variant="primary" onClick=${save}>${kpi ? 'Save' : 'Add KPI'}<//>`}>
    <${Field} label="Name"><input class="input" value=${f.name} onInput=${(e) => set('name', e.target.value)} placeholder="e.g. DMs sent per day" /><//>
    <div class="grid grid-2">
      <${Field} label="Daily/weekly target"><input class="input" type="number" min="0" value=${f.target} onInput=${(e) => set('target', e.target.value)} /><//>
      <${Field} label="Unit (optional)"><input class="input" value=${f.unit} onInput=${(e) => set('unit', e.target.value)} placeholder="DMs, £, calls…" /><//>
    </div>
    <${Field} label="Period"><${Select} value=${f.period} onChange=${(v) => set('period', v)} options=${[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} /><//>
    <${Field} label="How is it counted?" hint="Automatic KPIs track themselves from your activity."><${Select} value=${f.source} onChange=${(v) => set('source', v)} options=${SOURCES} /><//>
    <${Field} label="Colour"><div class="wrap-flex">
      ${COLORS.map((c) => html`<button class=${'svc-tab ' + (f.color === c ? 'active' : '')} onClick=${() => set('color', c)}><${StatusDot} color=${c} /> ${c}</button>`)}
    </div><//>
  <//>`;
}

export function KpisView() {
  const state = useStore();
  const [editing, setEditing] = useState(null); // kpi | 'new' | null
  const today = todayISO();

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">📊</span> KPIs</h1>
      <div class="spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setEditing('new')}>New KPI<//>
    </div>
    <div class="view"><div class="view-inner">
      <p class="muted mb-16" style="max-width:640px">Set daily and weekly targets that matter to you. Automatic KPIs update themselves; manual ones you tap to log. The dashboard shows where you're at against every one.</p>

      <div class="grid grid-2">
        ${state.kpis.map((k) => {
          const pr = kpiProgress(state, k, today);
          const isManual = k.source === 'manual';
          return html`<${SectionCard} key=${k.id}>
            <div class="kpi-top">
              <span class="kpi-name"><${StatusDot} color=${k.color} /> ${k.name}
                <${Pill} color="slate">${k.period}<//>
                ${!isManual && html`<${Pill} color="blue">auto<//>`}</span>
              <div class="row-flex">
                <${IconButton} name="edit" title="Edit" onClick=${() => setEditing(k)} />
                <${IconButton} name="trash" title="Delete" onClick=${() => { if (confirm('Delete KPI?')) { deleteKpi(k.id); toast('Deleted'); } }} />
              </div>
            </div>
            <div class="kpi-val mb-16" style="margin-top:4px;font-size:15px"><b style="font-size:24px">${pr.value}</b> <span class="muted">/ ${k.target} ${k.unit}</span> ${pr.hit ? html`<${Pill} color="green">Hit ✓<//>` : ''}</div>
            <${ProgressBar} pct=${pr.pct} color=${pr.hit ? 'green' : k.color} height=${10} />
            ${isManual && html`<div class="wrap-flex mt-16">
              <${Button} size="sm" icon="plus" onClick=${() => logKpi(k.id, 1)}>Log +1<//>
              <${Button} size="sm" variant="ghost" onClick=${() => logKpi(k.id, 5)}>+5<//>
              <${Button} size="sm" variant="ghost" onClick=${() => logKpi(k.id, -1)}>−1<//>
            </div>`}
          <//>`;
        })}
      </div>
    </div></div>
    ${editing && html`<${KpiForm} kpi=${editing === 'new' ? null : editing} onClose=${() => setEditing(null)} />`}
  </div>`;
}
