import { html, useState, useEffect, useRef } from '../dom.js';
import { Icon } from '../components/icons.js';
import { Button, IconButton, Pill, Avatar, Menu, SectionCard, serviceColor, EmptyState } from '../components/ui.js';
import { toast } from '../components/toast.js';
import { useStore, markSent, snoozeProspect } from '../store.js';
import { todayQueue, suggestVariant, nextStageLabel } from '../logic.js';
import { todayISO, fmtRelative, fillTemplate } from '../util.js';

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
}

function QueueItem({ p, state, active, onOpen, onSend, onQuick, onSnooze }) {
  const sug = suggestVariant(state, p);
  const preview = fillTemplate(sug.text, p).split('\n')[0];
  const label = nextStageLabel(state, p);
  return html`<div class=${'due-list-item ' + (active ? 'kbd-active' : '')}>
    <${Avatar} name=${p.name} handle=${p.handle} size=${34} />
    <div class="grow" style="cursor:pointer" onClick=${() => onOpen(p.id)}>
      <div class="row-flex"><span class="nm">${p.name}</span>
        ${p.service && html`<${Pill} color=${serviceColor(p.service)}>${p.service}<//>`}
        ${label && html`<${Pill} color="violet">${label}<//>`}
      </div>
      <div class="due-meta" style="margin-top:2px">
        ${p.followUpDate ? html`<span>${fmtRelative(p.followUpDate)}</span> · ` : ''}
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px;display:inline-block;vertical-align:bottom">“${preview}”</span>
      </div>
    </div>
    <div class="row-flex">
      <${Button} size="sm" variant="primary" icon="zap" title="Quick send (copy + mark sent)" onClick=${() => onQuick(p)}>Send<//>
      <${Menu} trigger=${html`<button class="icon-btn" title="More"><${Icon} name="menu" size=16 /></button>`}
        items=${[
          { label: 'Compose…', icon: 'message', onClick: () => onSend(p.id) },
          p.followUpDate && { label: 'Snooze 1 day', icon: 'clock', onClick: () => onSnooze(p.id, 1) },
          p.followUpDate && { label: 'Snooze 3 days', icon: 'clock', onClick: () => onSnooze(p.id, 3) },
          p.followUpDate && { label: 'Snooze 1 week', icon: 'clock', onClick: () => onSnooze(p.id, 7) },
          p.handle && { label: 'Open Instagram', icon: 'instagram', onClick: () => window.open('https://instagram.com/' + p.handle, '_blank') },
        ]} />
    </div>
  </div>`;
}

export function TodayView({ onOpen, onSend }) {
  const state = useStore();
  const { due, fresh } = todayQueue(state, todayISO());
  const [freshLimit, setFreshLimit] = useState(15);
  const queue = [...due, ...fresh.slice(0, freshLimit)];
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  const quickSend = async (p) => {
    const sug = suggestVariant(state, p);
    if (!sug.label) { toast('Sequence complete'); return; }
    await copyText(fillTemplate(sug.text, p));
    markSent(p.id, { variant: sug.variant });
    toast(`Copied & sent ${sug.label} → ${p.name}`, 'copy');
  };
  const doSnooze = (id, d) => { snoozeProspect(id, d); toast(`Snoozed ${d === 1 ? '1 day' : d === 7 ? '1 week' : d + ' days'}`); };

  // Keyboard queue: J/K move, Enter quick-send, S snooze 3d, O open.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const q = [...due, ...fresh.slice(0, freshLimit)];
      const i = cursorRef.current;
      if (e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(q.length - 1, c + 1)); }
      else if (e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key === 'Enter' && q[i]) { e.preventDefault(); quickSend(q[i]); }
      else if (e.key === 's' && q[i] && q[i].followUpDate) { e.preventDefault(); doSnooze(q[i].id, 3); }
      else if (e.key === 'o' && q[i]) { e.preventDefault(); onOpen(q[i].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [due, fresh, freshLimit]);

  const total = due.length + fresh.length;
  let idx = -1;

  return html`<div class="main">
    <div class="topbar">
      <h1><span class="page-emoji">🎯</span> Today</h1>
      <span class="muted" style="font-size:13px">${total} to work through · ${state.wsName}</span>
    </div>
    <div class="view"><div class="view-inner">
      <p class="muted mb-16" style="max-width:680px">Work top to bottom — no deciding required. <b>Send</b> copies the next message and marks it sent in one click. Keyboard: <kbd>J</kbd>/<kbd>K</kbd> move · <kbd>Enter</kbd> send · <kbd>S</kbd> snooze · <kbd>O</kbd> open.</p>

      <${SectionCard} title=${html`Due follow-ups <span class="group-count">${due.length}</span>`} className="mb-16">
        ${due.length === 0 && html`<${EmptyState} icon="check" title="No follow-ups due">Every scheduled follow-up is handled. Move on to fresh prospects below.<//>`}
        ${due.map((p) => { idx++; return html`<${QueueItem} key=${p.id} p=${p} state=${state} active=${idx === cursor} onOpen=${onOpen} onSend=${onSend} onQuick=${quickSend} onSnooze=${doSnooze} />`; })}
      <//>

      <${SectionCard} title=${html`Fresh — start the conversation <span class="group-count">${fresh.length}</span>`}>
        ${fresh.length === 0 && html`<${EmptyState} icon="user" title="No fresh prospects">Add more prospects, or import your next batch from Settings.<//>`}
        ${fresh.slice(0, freshLimit).map((p) => { idx++; return html`<${QueueItem} key=${p.id} p=${p} state=${state} active=${idx === cursor} onOpen=${onOpen} onSend=${onSend} onQuick=${quickSend} onSnooze=${doSnooze} />`; })}
        ${fresh.length > freshLimit && html`<button class="btn btn-ghost btn-sm mt-8" onClick=${() => setFreshLimit(freshLimit + 25)}>Show more (${fresh.length - freshLimit} remaining)</button>`}
      <//>
    </div></div>
  </div>`;
}
