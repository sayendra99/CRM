import { html, useState, useMemo } from '../dom.js';
import { Modal, Button, Pill, Field } from './ui.js';
import { Icon } from './icons.js';
import { toast } from './toast.js';
import { useStore, markSent } from '../store.js';
import { suggestVariant, variantsFor, nextStageLabel } from '../logic.js';
import { fillTemplate, todayISO } from '../util.js';

// Compose + copy + mark-sent. Sending stays manual — this fills the name token,
// suggests a non-repeating variant, and records what went out.
export function SendModal({ prospectId, onClose }) {
  const state = useStore();
  const prospect = state.prospects.find((p) => p.id === prospectId);
  const suggestion = useMemo(() => (prospect ? suggestVariant(state, prospect) : null), [prospectId, prospect && prospect.stage]);
  const [variant, setVariant] = useState(suggestion ? suggestion.variant : 0);
  const [note, setNote] = useState('');

  if (!prospect) return null;
  const stageLabel = nextStageLabel(state, prospect);
  if (!stageLabel) {
    return html`<${Modal} title=${'All caught up'} onClose=${onClose}>
      <p class="muted">${prospect.name} has completed every follow-up stage. Log their reply from the detail view, or archive them.</p>
    <//>`;
  }
  const service = prospect.service || Object.keys(state.messages.library)[0];
  const variants = variantsFor(state, service, stageLabel);
  const raw = variants[variant] || '';
  const filled = fillTemplate(raw, prospect);

  // Daily send guardrail against Instagram spam detection.
  const sentToday = state.activity.filter((a) => a.type === 'sent' && a.date === todayISO()).length;
  const cap = state.settings.dailyDmCap;
  const overCap = cap && sentToday >= cap;

  const copy = async () => {
    try { await navigator.clipboard.writeText(filled); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = filled; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  };
  const copyAndSend = async () => {
    await copy();
    markSent(prospect.id, { variant, note });
    toast(`Copied & logged — ${stageLabel} sent`, 'copy');
    onClose();
  };

  const handle = prospect.handle;
  return html`<${Modal} title=${'Compose message'} wide onClose=${onClose}
    footer=${html`
      <${Button} variant="ghost" onClick=${copy} icon="copy">Copy only<//>
      <${Button} variant="primary" onClick=${copyAndSend} icon="check">Copy & mark sent<//>
    `}>
    <div class="wrap-flex" style="justify-content:space-between;margin-bottom:14px">
      <div class="row-flex">
        <b>${prospect.name}</b>
        ${service && html`<${Pill} color="slate">${service}<//>`}
        <${Pill} color="violet">${stageLabel}<//>
      </div>
      ${handle && html`<a class="btn btn-sm btn-ghost" href=${'https://instagram.com/' + handle} target="_blank" rel="noopener">
        <${Icon} name="instagram" size=15 /> @${handle} <${Icon} name="external" size=13 /></a>`}
    </div>

    ${overCap && html`<div class="msg-preview" style="border-color:color-mix(in srgb,rgb(var(--pc-amber)) 40%,var(--border));margin-bottom:12px">
      ⚠️ You've already logged ${sentToday} sends today (cap ${cap}). Consider pausing to stay under Instagram's radar.</div>`}

    <div class="field">
      <span class="field-label">Variant — rotate to avoid repeats</span>
      <div class="wrap-flex">
        ${variants.map((_, i) => html`<button class=${'svc-tab ' + (i === variant ? 'active' : '')} onClick=${() => setVariant(i)}>Variant ${i + 1}</button>`)}
        ${suggestion && suggestion.variant === variant && html`<span class="muted" style="font-size:12px">Suggested ✓</span>`}
      </div>
    </div>

    <${Field} label="Message (name auto-filled, edit before sending)">
      <textarea class="input" rows=${8} readonly value=${filled}></textarea>
    <//>
    <${Field} label="Optional note (why this variant, context…)">
      <input class="input" value=${note} onInput=${(e) => setNote(e.target.value)} placeholder="e.g. mentioned their new listing" />
    <//>
    <p class="muted" style="font-size:12px">Paste into Instagram DMs manually, then mark as sent so the next follow-up is scheduled automatically.</p>
  <//>`;
}
