import { DEFAULT_SETTINGS, type Look, type SavedCard, type StudioSettings } from './types';

/* All studio data lives in this device's IndexedDB.
 * Small metadata (looks, settings, card index) is stored separately from Blobs. */
const DB_NAME = 'fabulous-future-me';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no private storage available.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('looks')) db.createObjectStore('looks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cards')) {
        const s = db.createObjectStore('cards', { keyPath: 'id' });
        s.createIndex('lookId', 'lookId');
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function run<T>(stores: string | string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let req: IDBRequest<T> | void;
    try {
      req = fn(t);
    } catch (e) {
      reject(e);
      return;
    }
    t.oncomplete = () => resolve(req ? req.result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Storage transaction was interrupted.'));
  });
}

export interface BlobRecord {
  id: string;
  blob: Blob;
  kind: 'reference' | 'result' | 'card';
  lookId: string;
  createdAt: string;
}

export const db = {
  listLooks: () => run<Look[]>('looks', 'readonly', (t) => t.objectStore('looks').getAll()).then((l) => l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  getLook: (id: string) => run<Look | undefined>('looks', 'readonly', (t) => t.objectStore('looks').get(id)),
  putLook: (look: Look) => run('looks', 'readwrite', (t) => { t.objectStore('looks').put(look); }),
  async deleteLook(id: string) {
    const look = await db.getLook(id);
    const cards = await run<SavedCard[]>('cards', 'readonly', (t) => t.objectStore('cards').index('lookId').getAll(id));
    await run(['looks', 'blobs', 'cards'], 'readwrite', (t) => {
      t.objectStore('looks').delete(id);
      const blobs = t.objectStore('blobs');
      look?.referenceImageIds.forEach((b) => blobs.delete(b));
      if (look?.render?.resultImageId) blobs.delete(look.render.resultImageId);
      cards.forEach((c) => {
        t.objectStore('cards').delete(c.id);
        blobs.delete(c.id);
      });
    });
  },
  putBlob: (rec: BlobRecord) => run('blobs', 'readwrite', (t) => { t.objectStore('blobs').put(rec); }),
  getBlob: (id: string) => run<BlobRecord | undefined>('blobs', 'readonly', (t) => t.objectStore('blobs').get(id)),
  deleteBlob: (id: string) => run('blobs', 'readwrite', (t) => { t.objectStore('blobs').delete(id); }),
  listCards: () => run<SavedCard[]>('cards', 'readonly', (t) => t.objectStore('cards').getAll()).then((c) => c.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  async saveCard(card: SavedCard, blob: Blob) {
    await run(['cards', 'blobs'], 'readwrite', (t) => {
      t.objectStore('blobs').put({ id: card.id, blob, kind: 'card', lookId: card.lookId, createdAt: card.createdAt } satisfies BlobRecord);
      t.objectStore('cards').put(card);
    });
  },
  deleteCard: (id: string) => run(['cards', 'blobs'], 'readwrite', (t) => { t.objectStore('cards').delete(id); t.objectStore('blobs').delete(id); }),
  async getSettings(): Promise<StudioSettings> {
    const s = await run<StudioSettings | undefined>('meta', 'readonly', (t) => t.objectStore('meta').get('settings'));
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  },
  putSettings: (s: StudioSettings) => run('meta', 'readwrite', (t) => { t.objectStore('meta').put(s, 'settings'); }),
  wipe: () => run(['looks', 'blobs', 'cards', 'meta'], 'readwrite', (t) => { ['looks', 'blobs', 'cards', 'meta'].forEach((s) => t.objectStore(s).clear()); }),
};

export function friendlyStorageError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'QuotaExceededError') return "Your device's studio drawer is full. Your draft is still here on screen. Free some space (remove old cards or references) and save again.";
  return "We couldn't tuck this into your device's storage just now. Nothing on screen was lost — try saving again in a moment.";
}

let persistAsked = false;
export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  if (await navigator.storage.persisted?.()) return true;
  if (persistAsked) return false;
  persistAsked = true;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function newId(prefix = 'look'): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${r}`;
}
