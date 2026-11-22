import { html, useState } from '../dom.js';
import { Modal, Button, Field, Select, TagEditor } from './ui.js';
import { useStore, addProspect, updateProspect } from '../store.js';
import { toast } from './toast.js';

export function ProspectModal({ prospectId, onClose }) {
  const state = useStore();
  const prospectTypes = state.settings.prospectTypes || [];
  const leadSources = state.settings.leadSources || [];
  const editing = prospectId ? state.prospects.find((p) => p.id === prospectId) : null;
  const [f, setF] = useState(editing
    ? { ...editing }
    : { name: '', handle: '', service: '', leadSource: 'Not specified', groupId: (state.groups[0] || {}).id || 'g_leads', notes: '', propertyNotes: '', followUpDate: '', email: '', phone: '', website: '', location: '', tags: [], custom: {} });
  const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
  const allGroups = [...new Set([...(state.suggestedTags || []), ...state.prospects.flatMap((p) => p.tags || [])])];

  const save = () => {
    if (!f.name && !f.handle) { toast('Add a name or handle', 'x'); return; }
    if (editing) { updateProspect(editing.id, f); toast('Saved'); }
    else { addProspect(f); toast('Prospect added'); }
    onClose();
  };

  return html`<${Modal} title=${editing ? 'Edit prospect' : 'Add prospect'} wide onClose=${onClose}
    footer=${html`<${Button} variant="ghost" onClick=${onClose}>Cancel<//><${Button} variant="primary" onClick=${save}>${editing ? 'Save' : 'Add prospect'}<//>`}>
    <div class="grid grid-2">
      <${Field} label="Name"><input class="input" value=${f.name} onInput=${set('name')} placeholder="e.g. Danielle" /><//>
      <${Field} label="Instagram handle" hint="Used for duplicate detection"><input class="input" value=${f.handle} onInput=${set('handle')} placeholder="username (no @)" /><//>
    </div>
    <div class="grid grid-2">
      <${Field} label="Prospect Type" hint="What they are"><${Select} value=${f.service} onChange=${(v) => setF({ ...f, service: v })} options=${prospectTypes} placeholder="— select —" /><//>
      <${Field} label="Lead Source" hint="Where you found them"><${Select} value=${f.leadSource} onChange=${(v) => setF({ ...f, leadSource: v })} options=${leadSources} placeholder="— select —" /><//>
    </div>
    <div class="grid grid-2">
      <${Field} label="Pipeline Stage"><${Select} value=${f.groupId} onChange=${(v) => setF({ ...f, groupId: v })} options=${state.groups.map((g) => ({ value: g.id, label: g.name }))} /><//>
      <${Field} label="Email"><input class="input" type="email" value=${f.email} onInput=${set('email')} placeholder="name@company.com" /><//>
    </div>
    <div class="grid grid-2">
      <${Field} label="Phone"><input class="input" value=${f.phone} onInput=${set('phone')} placeholder="07…" /><//>
      <${Field} label="Website"><input class="input" value=${f.website} onInput=${set('website')} placeholder="example.com" /><//>
    </div>
    <div class="grid grid-2">
      <${Field} label="Location"><input class="input" value=${f.location} onInput=${set('location')} placeholder="Birmingham" /><//>
    </div>

    <${Field} label="Groups" hint="Organise into any number of buckets">
      <${TagEditor} tags=${f.tags || []} suggestions=${allGroups}
        onAdd=${(t) => setF({ ...f, tags: [...new Set([...(f.tags || []), t])] })}
        onRemove=${(t) => setF({ ...f, tags: (f.tags || []).filter((x) => x !== t) })} />
    <//>

    ${(state.settings.customFields || []).length > 0 && html`<div class="grid grid-2">
      ${state.settings.customFields.map((cf) => html`<${Field} label=${cf.label} key=${cf.id}>
        <input class="input" value=${(f.custom || {})[cf.id] || ''} onInput=${(e) => setF({ ...f, custom: { ...(f.custom || {}), [cf.id]: e.target.value } })} />
      <//>`)}
    </div>`}

    <div class="grid grid-2">
      <${Field} label="First follow-up / contact date"><input class="input" type="date" value=${f.followUpDate || ''} onInput=${set('followUpDate')} /><//>
    </div>
    <${Field} label="Property notes" hint="Shown as a column in the main pipeline"><textarea class="input" rows=${2} value=${f.propertyNotes || ''} onInput=${set('propertyNotes')} placeholder="Addresses, unit types, project specifics…"></textarea><//>
    <${Field} label="Notes"><textarea class="input" rows=${3} value=${f.notes} onInput=${set('notes')}></textarea><//>
  <//>`;
}
