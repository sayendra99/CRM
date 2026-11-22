import { html, useState, useEffect } from '../dom.js';
import { Button, IconButton, Pill, Avatar, Select, StatusDot, TagEditor, serviceColor } from './ui.js';
import { Icon } from './icons.js';
import { toast } from './toast.js';
import {
  useStore, updateProspect, setReply, archiveProspect, deleteProspect, moveProspect, undoLastSend,
  addTag, removeTag, logNote, snoozeProspect, setCustomValue,
} from '../store.js';
import { variantsFor, nextStageLabel } from '../logic.js';
import { fillTemplate, fmtDate, fmtRelative } from '../util.js';

const REPLY_OPTS = [
  { v: 'none', label: 'No reply', color: 'slate' },
  { v: 'positive', label: 'Positive', color: 'green' },
  { v: 'negative', label: 'Negative', color: 'rose' },
];

// Inline text field: edits locally, saves on blur (no cursor jumps).
function EditableText({ value, onSave, placeholder, type = 'text', link }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { setV(value || ''); }, [value]);
  return html`<div class="row-flex" style="flex:1;gap:6px">
    <input class="input" type=${type} value=${v} placeholder=${placeholder}
      onInput=${(e) => setV(e.target.value)} onBlur=${() => { if (v !== (value || '')) onSave(v); }} />
    ${link && v && html`<a class="icon-btn" href=${link(v)} target="_blank" rel="noopener" title="Open"><${Icon} name="external" size=15 /></a>`}
  </div>`;
}

export function ProspectDrawer({ prospectId, onClose, onSend, onEdit }) {
  const state = useStore();
  const p = state.prospects.find((x) => x.id === prospectId);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(p ? p.notes : '');
  const [propNotes, setPropNotes] = useState(p ? (p.propertyNotes || '') : '');
  useEffect(() => { setNotes(p ? p.notes : ''); setPropNotes(p ? (p.propertyNotes || '') : ''); setNote(''); }, [prospectId]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!p) return null;

  const prospectTypes = state.settings.prospectTypes || [];
  const leadSources = state.settings.leadSources || [];
  const stageLabel = nextStageLabel(state, p);
  const stageOrder = state.messages.stageOrder;
  const svc = p.service || Object.keys(state.messages.library)[0];
  const allGroups = [...new Set([...(state.suggestedTags || []), ...state.prospects.flatMap((x) => x.tags || [])])];
  const timeline = [...p.history].reverse();
  const canSnooze = p.stage > 0 && p.followUpDate;

  return html`<div class="drawer-overlay" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="drawer">
      <div class="drawer-head">
        <div class="row-flex" style="justify-content:space-between">
          <div class="row-flex">
            <${Avatar} name=${p.name} handle=${p.handle} size=${38} />
            <div>
              <div style="font-weight:680;font-size:16px">${p.name}</div>
              ${p.handle && html`<a class="muted" style="font-size:13px;text-decoration:none" href=${'https://instagram.com/' + p.handle} target="_blank" rel="noopener">
                <${Icon} name="instagram" size=12 style="display:inline;vertical-align:-2px" /> @${p.handle}</a>`}
            </div>
          </div>
          <div class="row-flex">
            <${IconButton} name="edit" title="Edit" onClick=${() => onEdit(p.id)} />
            <${IconButton} name="x" title="Close" onClick=${onClose} />
          </div>
        </div>
        <div class="wrap-flex mt-16">
          ${stageLabel
            ? html`<${Button} variant="primary" size="sm" icon="message" onClick=${() => onSend(p.id)}>Send ${stageLabel}<//>`
            : html`<${Pill} color="green">Sequence complete<//>`}
          ${canSnooze && html`
            <${Button} size="sm" icon="clock" onClick=${() => { snoozeProspect(p.id, 1); toast('Snoozed 1 day'); }}>+1d<//>
            <${Button} size="sm" variant="ghost" onClick=${() => { snoozeProspect(p.id, 3); toast('Snoozed 3 days'); }}>+3d<//>
            <${Button} size="sm" variant="ghost" onClick=${() => { snoozeProspect(p.id, 7); toast('Snoozed 1 week'); }}>+1w<//>`}
        </div>
      </div>

      <div class="drawer-body">
        <!-- Pipeline -->
        <div class="drawer-section">
          <h4>Pipeline stage</h4>
          <div class="stage-track" style="margin-bottom:10px">
            ${stageOrder.map((s, i) => html`<div class=${'stage-seg ' + (i < p.stage ? 'filled' : '')} title=${s} style="width:34px;height:7px"></div>`)}
          </div>
          <div class="muted" style="font-size:13px">
            ${p.stage} of ${stageOrder.length} messages sent${p.followUpDate ? ` · next ${stageLabel} due ${fmtDate(p.followUpDate)} (${fmtRelative(p.followUpDate)})` : ''}
          </div>
          ${p.stage > 0 && html`<button class="btn btn-sm btn-ghost mt-8" onClick=${() => { undoLastSend(p.id); toast('Reverted last send'); }}><${Icon} name="undo" size=14 /> Undo last send</button>`}
        </div>

        <!-- Reply -->
        <div class="drawer-section">
          <h4>Their reply</h4>
          <div class="wrap-flex">
            ${REPLY_OPTS.map((o) => html`<button class=${'svc-tab ' + (p.replyStatus === o.v ? 'active' : '')}
              onClick=${() => { setReply(p.id, o.v); toast(o.v === 'none' ? 'Reply cleared' : 'Reply logged — automations run'); }}>
              <${StatusDot} color=${o.color} /> ${o.label}</button>`)}
          </div>
        </div>

        <!-- Groups -->
        <div class="drawer-section">
          <h4>Groups</h4>
          <${TagEditor} tags=${p.tags || []} suggestions=${allGroups}
            onAdd=${(t) => addTag(p.id, t)} onRemove=${(t) => removeTag(p.id, t)} />
        </div>

        <!-- Contact & details -->
        <div class="drawer-section">
          <h4>Details</h4>
          <div class="kv"><span class="k">Prospect Type</span>
            <${Select} value=${p.service} onChange=${(v) => updateProspect(p.id, { service: v })} options=${prospectTypes} placeholder="— none —" /></div>
          <div class="kv"><span class="k">Lead Source</span>
            <${Select} value=${p.leadSource || 'Not specified'} onChange=${(v) => updateProspect(p.id, { leadSource: v })} options=${leadSources} placeholder="— none —" /></div>
          <div class="kv"><span class="k">Pipeline Stage</span>
            <${Select} value=${p.groupId} onChange=${(v) => moveProspect(p.id, v)} options=${state.groups.map((g) => ({ value: g.id, label: g.name }))} /></div>
          <div class="kv"><span class="k">Email</span><${EditableText} value=${p.email} placeholder="—" type="email" onSave=${(v) => updateProspect(p.id, { email: v })} link=${(v) => 'mailto:' + v} /></div>
          <div class="kv"><span class="k">Phone</span><${EditableText} value=${p.phone} placeholder="—" onSave=${(v) => updateProspect(p.id, { phone: v })} link=${(v) => 'tel:' + v.replace(/\s/g, '')} /></div>
          <div class="kv"><span class="k">Website</span><${EditableText} value=${p.website} placeholder="—" onSave=${(v) => updateProspect(p.id, { website: v })} link=${(v) => (v.startsWith('http') ? v : 'https://' + v)} /></div>
          <div class="kv"><span class="k">Location</span><${EditableText} value=${p.location} placeholder="—" onSave=${(v) => updateProspect(p.id, { location: v })} /></div>
          <div class="kv"><span class="k">Next due</span>
            <input class="input" type="date" value=${p.followUpDate || ''} onInput=${(e) => updateProspect(p.id, { followUpDate: e.target.value })} /></div>
          <div class="kv"><span class="k">Last touch</span><span>${p.lastInteraction ? fmtDate(p.lastInteraction) : '—'}</span></div>
          ${(state.settings.customFields || []).map((cf) => html`<div class="kv" key=${cf.id}>
            <span class="k">${cf.label}</span>
            <${EditableText} value=${(p.custom || {})[cf.id] || ''} placeholder="—" onSave=${(v) => setCustomValue(p.id, cf.id, v)} /></div>`)}
        </div>

        <!-- Property notes -->
        <div class="drawer-section">
          <h4>Property notes</h4>
          <textarea class="input" rows=${3} value=${propNotes} onInput=${(e) => setPropNotes(e.target.value)}
            onBlur=${() => { updateProspect(p.id, { propertyNotes: propNotes }); }} placeholder="Property details — addresses, unit types, project specifics…"></textarea>
        </div>

        <!-- Notes -->
        <div class="drawer-section">
          <h4>Notes</h4>
          <textarea class="input" rows=${3} value=${notes} onInput=${(e) => setNotes(e.target.value)}
            onBlur=${() => { updateProspect(p.id, { notes }); }} placeholder="Add context, preferences, anything worth remembering…"></textarea>
        </div>

        <!-- Activity -->
        <div class="drawer-section">
          <h4>Activity</h4>
          <div class="wrap-flex" style="margin-bottom:12px;gap:8px">
            <input class="input" style="flex:1" value=${note} placeholder="Log a note or interaction…"
              onInput=${(e) => setNote(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && note.trim()) { logNote(p.id, note); setNote(''); toast('Logged'); } }} />
            <${Button} size="sm" onClick=${() => { if (note.trim()) { logNote(p.id, note); setNote(''); toast('Logged'); } }}>Log<//>
          </div>
          ${timeline.length === 0 && html`<p class="muted" style="font-size:13px">Nothing logged yet.</p>`}
          ${timeline.map((h) => {
            if (h.type === 'reply') {
              return html`<div class="timeline-item reply" key=${h.id}>
                <div><div class="row-flex"><b style="font-size:13px">Reply received</b> <${Pill} color=${h.value === 'positive' ? 'green' : h.value === 'negative' ? 'rose' : 'slate'}>${h.value}<//></div>
                <div class="muted" style="font-size:12px">${fmtDate(h.date)}</div></div></div>`;
            }
            if (h.type === 'note') {
              return html`<div class="timeline-item note" key=${h.id}>
                <div style="flex:1"><b style="font-size:13px">Note</b>
                <div class="muted" style="font-size:12px;margin:2px 0 6px">${fmtDate(h.date)}</div>
                <div class="msg-preview">${h.text}</div></div></div>`;
            }
            const variants = variantsFor(state, svc, h.stageLabel);
            const text = fillTemplate(variants[h.variant] || '', p);
            return html`<div class="timeline-item" key=${h.id}>
              <div style="flex:1;min-width:0">
                <div class="row-flex"><b style="font-size:13px">${h.stageLabel}</b> <${Pill} color="violet">Variant ${(h.variant ?? 0) + 1}<//></div>
                <div class="muted" style="font-size:12px;margin:2px 0 6px">${fmtDate(h.date)}${h.note ? ' · ' + h.note : ''}</div>
                <div class="msg-preview">${text}</div>
              </div></div>`;
          })}
        </div>

        <!-- Danger -->
        <div class="drawer-section">
          <div class="wrap-flex">
            <${Button} variant="ghost" size="sm" icon="archive" onClick=${() => { archiveProspect(p.id, !p.archived); toast(p.archived ? 'Unarchived' : 'Archived'); if (!p.archived) onClose(); }}>${p.archived ? 'Unarchive' : 'Archive'}<//>
            <${Button} variant="danger" size="sm" icon="trash" onClick=${() => { if (confirm('Delete ' + p.name + ' permanently?')) { deleteProspect(p.id); onClose(); toast('Deleted'); } }}>Delete<//>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
