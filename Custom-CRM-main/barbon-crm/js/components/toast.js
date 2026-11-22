import { html, useReducer, useEffect } from '../dom.js';
import { uid } from '../util.js';
import { Icon } from './icons.js';

let items = [];
const listeners = new Set();
function emit() { listeners.forEach((l) => l()); }

export function toast(msg, icon = 'check') {
  const id = uid('t');
  items = [...items, { id, msg, icon }];
  emit();
  setTimeout(() => { items = items.filter((i) => i.id !== id); emit(); }, 2600);
}

export function ToastHost() {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => { listeners.add(force); return () => listeners.delete(force); }, []);
  return html`<div class="toast-wrap">
    ${items.map((t) => html`<div class="toast" key=${t.id}>
      <${Icon} name=${t.icon} size=${15} /> <span>${t.msg}</span>
    </div>`)}
  </div>`;
}
