// Storage abstraction. The rest of the app only knows the StorageAdapter
// interface (load / save / meta), so swapping localStorage for a cloud/API
// backend later is a single-file change — no view or store code changes.
//
//   interface StorageAdapter {
//     load(): state | null
//     save(state): void        // may be async in a remote adapter
//     info(): { kind, label }
//   }

const KEY = 'barbon-crm-v1';

export class LocalStorageAdapter {
  constructor(key = KEY) { this.key = key; }
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('LocalStorageAdapter.load failed', e);
      return null;
    }
  }
  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('LocalStorageAdapter.save failed (quota?)', e);
      return false;
    }
  }
  info() { return { kind: 'local', label: 'This device (offline)' }; }
}

// Placeholder for the future "sync-ready later" path. Implementing load/save
// against a REST or Supabase endpoint here is all that cloud sync requires.
export class RemoteAdapter {
  constructor(config) { this.config = config; }
  async load() { throw new Error('RemoteAdapter not configured yet'); }
  async save() { throw new Error('RemoteAdapter not configured yet'); }
  info() { return { kind: 'remote', label: 'Cloud sync (not configured)' }; }
}

export function makeAdapter() {
  // Single decision point for which backend the app uses.
  return new LocalStorageAdapter();
}
