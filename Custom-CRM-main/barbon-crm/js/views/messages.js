import { html, useState, useEffect } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Field, EmptyState } from '../components/ui.js';
import { toast } from '../components/toast.js';
import { useStore, updateVariant, addVariant, removeVariant, updateCadence } from '../store.js';

function VariantEditor({ service, stageLabel, index, text, canRemove }) {
  const [val, setVal] = useState(text);
  useEffect(() => { setVal(text); }, [text, service, stageLabel]);
  const copy = async () => { try { await navigator.clipboard.writeText(val); toast('Copied'); } catch (e) {} };
  return html`<div class="variant-row">
    <div class="variant-head">
      <span class="variant-num">Variant ${index + 1}</span>
      <div class="spacer"></div>
      <${IconButton} name="copy" title="Copy" onClick=${copy} />
      ${canRemove && html`<${IconButton} name="trash" title="Remove variant" onClick=${() => removeVariant(service, stageLabel, index)} />`}
    </div>
    <textarea class="input" rows=${5} value=${val}
      onInput=${(e) => setVal(e.target.value)}
      onBlur=${() => { if (val !== text) { updateVariant(service, stageLabel, index, val); toast('Saved'); } }}></textarea>
  </div>`;
}

export function MessagesView() {
  const state = useStore();
  const services = Object.keys(state.messages.library);
  const [serviceSel, setService] = useState(services[0]);
  const service = services.includes(serviceSel) ? serviceSel : services[0];
  const stageOrder = state.messages.stageOrder;
  const lib = state.messages.library[service] || {};

  if (services.length === 0) {
    return html`<div class="main">
      <div class="topbar"><h1><span class="page-emoji">✍️</span> Messages</h1><span class="muted" style="font-size:13px;margin-left:8px">${state.wsName}</span></div>
      <div class="view"><div class="view-inner">
        <${EmptyState} icon="message" title="No templates in this workspace yet">This workspace has no service types or message templates set up. Add them from Settings, or ask to have starter templates drafted.<//>
      </div></div>
    </div>`;
  }

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">✍️</span> Messages</h1>
      <span class="muted" style="font-size:13px;margin-left:8px">${state.wsName}</span>
    </div>
    <div class="view"><div class="view-inner">
      <p class="muted mb-16" style="max-width:680px">Three distinct variants per stage keep your outreach from looking automated. The app rotates them and never repeats a variant to the same person. <b>{name}</b> is auto-filled with their first name when you send.</p>

      <div class="msg-service-tabs">
        ${services.map((s) => html`<button class=${'svc-tab ' + (s === service ? 'active' : '')} onClick=${() => setService(s)}>${s}</button>`)}
      </div>

      ${stageOrder.map((stage) => {
        const variants = lib[stage] || [];
        const days = state.messages.cadenceDays[stage];
        return html`<div class="stage-block" key=${stage}>
          <div class="stage-block-head">
            <${Pill} color="violet">${stage}<//>
            <span class="muted" style="font-size:12.5px">${variants.length} variants</span>
            <div class="spacer"></div>
            ${stage !== 'First DM' && html`<div class="row-flex" style="font-size:12.5px" title="Days after the previous message">
              <${Icon} name="clock" size=14 />
              <input class="input" type="number" min="1" style="width:64px;padding:4px 8px" value=${days}
                onChange=${(e) => updateCadence(stage, e.target.value)} />
              <span class="muted">days later</span>
            </div>`}
            <${IconButton} name="plus" title="Add variant" onClick=${() => addVariant(service, stage)} />
          </div>
          ${variants.map((t, i) => html`<${VariantEditor} key=${service + stage + i} service=${service} stageLabel=${stage} index=${i} text=${t} canRemove=${variants.length > 1} />`)}
        </div>`;
      })}
    </div></div>
  </div>`;
}
