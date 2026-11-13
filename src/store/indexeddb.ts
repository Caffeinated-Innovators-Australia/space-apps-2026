// On-device storage. Uses IndexedDB (the database built into the browser), and falls back to
// memory if the browser blocks it, so the app always runs.
import type { State, Store } from '../core/types.ts';

const DB = 'crew-health';
const TABLE = 'state';
const KEY = 'device';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABLE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function deviceStore(): Store {
  let memory: State | null = null;
  return {
    async load() {
      try {
        const db = await open();
        return await new Promise<State | null>((resolve, reject) => {
          const req = db.transaction(TABLE, 'readonly').objectStore(TABLE).get(KEY);
          req.onsuccess = () => resolve((req.result as State | undefined) ?? null);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return memory;
      }
    },
    async save(state) {
      memory = state;
      try {
        const db = await open();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(TABLE, 'readwrite');
          tx.objectStore(TABLE).put(state, KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        /* storage is optional: the session still works from memory */
      }
    },
  };
}
