/**
 * Offline queue — stores actions in IndexedDB when offline, syncs on reconnect.
 */

const DB_NAME = 'majestic-ops-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

interface QueuedAction {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'rpc';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const entry: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  };
  store.add(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeAction(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const { supabase } = await import('@/lib/supabase');
  const actions = await getQueuedActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions.sort((a, b) => a.timestamp - b.timestamp)) {
    try {
      if (action.operation === 'rpc') {
        await supabase.rpc(action.table, action.payload as any);
      } else if (action.operation === 'insert') {
        await supabase.from(action.table).insert(action.payload);
      } else if (action.operation === 'update') {
        const { id, ...rest } = action.payload;
        await supabase.from(action.table).update(rest).eq('id', id);
      } else if (action.operation === 'delete') {
        await supabase.from(action.table).delete().eq('id', action.payload.id);
      }
      await removeAction(action.id);
      synced++;
    } catch (err) {
      failed++;
      console.error('Failed to sync action:', action.id, err);
    }
  }

  return { synced, failed };
}

// Auto-sync on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const result = await syncQueue();
    if (result.synced > 0) {
      console.log(`Synced ${result.synced} queued actions`);
    }
  });
}

