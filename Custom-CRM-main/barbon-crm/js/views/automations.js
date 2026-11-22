import { html, useState } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Toggle, Modal, Field, Select, SectionCard } from '../components/ui.js';
import { toast } from '../components/toast.js';
import { useStore, addAutomation, updateAutomation, deleteAutomation, toggleAutomation, updateSettings } from '../store.js';

function describeTrigger(t, groups) {
  if (t.type === 'reply') return `Reply received is ${t.value}`;
  if (t.type === 'stage') return `Messages sent ${t.op} ${t.value}`;
  if (t.type === 'stale') return `No reply after ${t.value} days`;
  if (t.type === 'field') {
    const f = t.field === 'service' ? 'Prospect Type' : t.field === 'leadSource' ? 'Lead Source' : 'Group';
    return `${f} is “${t.value || '?'}” (on add)`;
  }
  return 'Unknown trigger';
}
function describeAction(a, groups) {
  if (a.type === 'move') { const g = groups.find((x) => x.id === a.groupId); return `Move to stage “${g ? g.name : '?'}”`; }
  if (a.type === 'archive') return 'Archive prospect';
  if (a.type === 'group') return `Add to group “${a.group || '?'}”`;
  if (a.type === 'setStage') return `Set sequence to ${a.value}`;
  return 'Do nothing';
}

function RuleForm({ rule, groups, groupTags, types, sources, onClose }) {
  const [f, setF] = useState(rule || {
    name: '', trigger: { type: 'reply', value: 'positive' }, action: { type: 'move', groupId: groups[0].id },
  });
  const setTrig = (patch) => setF({ ...f, trigger: { ...f.trigger, ...patch } });
  const setAct = (patch) => setF({ ...f, action: { ...f.action, ...patch } });
  const save = () => {
    const name = f.name.trim() || `${describeTrigger(f.trigger, groups)} → ${describeAction(f.action, groups)}`;
    const data = { ...f, name };
    if (rule) updateAutomation(rule.id, data); else addAutomation(data);
    toast(rule ? 'Rule updated' : 'Rule created');
    onClose();
  };
  return html`<${Modal} title=${rule ? 'Edit rule' : 'New automation'} onClose=${onClose}
    footer=${html`<${Button} variant="ghost" onClick=${onClose}>Cancel<//><${Button} variant="primary" onClick=${save}>${rule ? 'Save' : 'Create rule'}<//>`}>
    <${Field} label="Name (optional)"><input class="input" value=${f.name} onInput=${(e) => setF({ ...f, name: e.target.value })} placeholder="Describe it, or leave blank to auto-name" /><//>

    <div class="auto-node" style="margin-bottom:12px;padding:14px">
      <div class="field-label mb-16" style="margin-bottom:8px">WHEN</div>
      <${Select} value=${f.trigger.type} onChange=${(v) => setTrig(
        v === 'reply' ? { type: 'reply', value: 'positive' }
          : v === 'stage' ? { type: 'stage', op: '>=', value: 6 }
          : v === 'stale' ? { type: 'stale', value: 14 }
          : { type: 'field', field: 'leadSource', value: (sources[0] || '') })}
        options=${[{ value: 'reply', label: 'A reply is received' }, { value: 'stage', label: 'Messages-sent count reaches…' }, { value: 'stale', label: 'No reply after N days' }, { value: 'field', label: 'Prospect matches a field (on add)' }]} />
      ${f.trigger.type === 'reply' && html`<div class="mt-8"><${Select} value=${f.trigger.value} onChange=${(v) => setTrig({ value: v })}
        options=${[{ value: 'positive', label: 'Positive reply' }, { value: 'negative', label: 'Negative reply' }, { value: 'any', label: 'Any reply' }]} /></div>`}
      ${f.trigger.type === 'field' && html`<div class="wrap-flex mt-8">
        <${Select} value=${f.trigger.field} onChange=${(v) => setTrig({ field: v, value: (v === 'service' ? types[0] : v === 'group' ? groupTags[0] : sources[0]) || '' })}
          options=${[{ value: 'service', label: 'Prospect Type' }, { value: 'leadSource', label: 'Lead Source' }, { value: 'group', label: 'Group' }]} />
        <span class="muted">is</span>
        <${Select} value=${f.trigger.value} onChange=${(v) => setTrig({ value: v })}
          options=${(f.trigger.field === 'service' ? types : f.trigger.field === 'group' ? groupTags : sources)} />
      </div>
      <div class="muted mt-8" style="font-size:12px">Checked when a prospect is added or imported.</div>`}
      ${f.trigger.type === 'stage' && html`<div class="wrap-flex mt-8">
        <${Select} value=${f.trigger.op} onChange=${(v) => setTrig({ op: v })} options=${['>=', '==', '>', '<=', '<']} />
        <input class="input" type="number" min="0" max="6" style="width:80px" value=${f.trigger.value} onInput=${(e) => setTrig({ value: Number(e.target.value) })} />
        <span class="muted">messages sent (0–6)</span>
      </div>`}
      ${f.trigger.type === 'stale' && html`<div class="wrap-flex mt-8">
        <span class="muted">Contacted, no reply, quiet for</span>
        <input class="input" type="number" min="1" style="width:80px" value=${f.trigger.value} onInput=${(e) => setTrig({ value: Number(e.target.value) })} />
        <span class="muted">days</span>
      </div>`}
    </div>

    <div class="auto-node" style="padding:14px">
      <div class="field-label" style="margin-bottom:8px">THEN</div>
      <${Select} value=${f.action.type} onChange=${(v) => setAct(v === 'move' ? { type: 'move', groupId: groups[0].id } : v === 'group' ? { type: 'group', group: (groupTags[0] || '') } : { type: v })}
        options=${[{ value: 'move', label: 'Move to a pipeline stage' }, { value: 'group', label: 'Add to a group' }, { value: 'archive', label: 'Archive the prospect' }]} />
      ${f.action.type === 'move' && html`<div class="mt-8"><${Select} value=${f.action.groupId} onChange=${(v) => setAct({ groupId: v })}
        options=${groups.map((g) => ({ value: g.id, label: g.name }))} /></div>`}
      ${f.action.type === 'group' && html`<div class="mt-8"><input class="input" list="__grouptags" value=${f.action.group || ''} onInput=${(e) => setAct({ group: e.target.value })} placeholder="Group name" />
        <datalist id="__grouptags">${groupTags.map((t) => html`<option value=${t}></option>`)}</datalist></div>`}
    </div>
  <//>`;
}

export function AutomationsView() {
  const state = useStore();
  const [editing, setEditing] = useState(null);
  const master = state.settings.autorunAutomations;

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">⚡</span> Automations</h1>
      <div class="spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setEditing('new')}>New rule<//>
    </div>
    <div class="view"><div class="view-inner">
      <div class="auto-card ${master ? '' : 'off'}" style="display:flex;align-items:center;gap:14px">
        <${Icon} name="zap" size=20 style=${'color:rgb(var(--accent))'} />
        <div style="flex:1">
          <b>Automations ${master ? 'active' : 'paused'}</b>
          <div class="muted" style="font-size:13px">Master switch — turn everything off without deleting your rules.</div>
        </div>
        <${Toggle} checked=${master} onChange=${(v) => { updateSettings({ autorunAutomations: v }); toast(v ? 'Automations on' : 'Automations paused'); }} />
      </div>

      <p class="muted" style="max-width:660px;margin:6px 0 18px">Reply and message rules run the moment they're triggered; the “no reply after N days” rule is checked automatically each time you open the app. Build your own below and toggle each on or off.</p>

      ${state.automations.length === 0 && html`<div class="empty"><div class="empty-icon"><${Icon} name="zap" size=24 /></div><h4>No rules yet</h4><p>Create your first automation.</p></div>`}
      ${state.automations.map((a) => html`<div class=${'auto-card ' + (a.enabled && master ? '' : 'off')} key=${a.id}>
        <div class="row-flex" style="justify-content:space-between">
          <b>${a.name}</b>
          <div class="row-flex">
            <${IconButton} name="edit" title="Edit" onClick=${() => setEditing(a)} />
            <${IconButton} name="trash" title="Delete" onClick=${() => { if (confirm('Delete rule?')) { deleteAutomation(a.id); toast('Deleted'); } }} />
            <${Toggle} checked=${a.enabled} onChange=${() => toggleAutomation(a.id)} />
          </div>
        </div>
        <div class="auto-flow">
          <span class="muted">WHEN</span> <span class="auto-node">${describeTrigger(a.trigger, state.groups)}</span>
          <${Icon} name="arrowRight" size=16 />
          <span class="muted">THEN</span> <span class="auto-node">${describeAction(a.action, state.groups)}</span>
        </div>
      </div>`)}
    </div></div>
    ${editing && html`<${RuleForm} rule=${editing === 'new' ? null : editing} groups=${state.groups}
      types=${state.settings.prospectTypes || []} sources=${state.settings.leadSources || []}
      groupTags=${[...new Set([...(state.suggestedTags || []), ...state.prospects.flatMap((p) => p.tags || [])])]} onClose=${() => setEditing(null)} />`}
  </div>`;
}
