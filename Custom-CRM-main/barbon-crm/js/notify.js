// Optional browser notifications for due follow-ups. Real background push needs
// a server; this covers "remind me while the app is installed/open in the
// background", which is what a local-first PWA can reliably do.
import { getState } from './store.js';
import { dueCount } from './logic.js';
import { todayISO } from './util.js';

export async function requestNotifications() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

let lastNotified = null;
function fire(force = false) {
  const state = getState();
  if (!state.settings.notifications) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const key = todayISO() + ':' + (document.hidden ? 'bg' : 'fg');
  if (!force && lastNotified === key) return;
  const n = dueCount(state);
  if (n <= 0) return;
  lastNotified = key;
  try {
    new Notification('Barbon CRM — follow-ups due', {
      body: `${n} ${n === 1 ? 'prospect is' : 'prospects are'} due for a follow-up today. Serve them well. 🙏`,
      icon: './assets/icon-192.png', tag: 'barbon-due', renotify: false,
    });
  } catch (e) { /* Safari requires SW for notifications; ignore gracefully */ }
}

export function initNotifications() {
  // Nudge when the operator leaves the app with work outstanding.
  document.addEventListener('visibilitychange', () => { if (document.hidden) setTimeout(() => fire(), 400); });
  // Periodic heartbeat while open.
  setInterval(() => fire(), 30 * 60 * 1000);
}
