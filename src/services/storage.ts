/**
 * Client storage service ensuring all custom configurations, uploaded backgrounds,
 * scan states, and room records are permanently cached in browser IndexedDB and LocalStorage.
 * Meets requirement: "앱 내에서 새로 입력하고 수정하는 모든 데이터베이스는 브라우저 캐시에 남아서 사라지지 않게 해줘."
 */

export interface CachedRoomData {
  roomId: string;
  totalSeeds: number;
  scannedSeeds: number[];
  stage: 'accumulating' | 'ready_to_blow' | 'blowing' | 'blooming' | 'ending';
  bgPreset: string;
  customBgUrl: string | null;
  endingImageUrl?: string | null;
  bgDim?: number;
  lastUpdated: number;
}

export interface ScanLogEntry {
  id: string;
  roomId: string;
  seedNumber: number;
  timestamp: number;
}

const DB_NAME = 'DandelionFriendshipDB';
const DB_VERSION = 1;
const STORE_ROOMS = 'rooms';
const STORE_BACKGROUNDS = 'backgrounds';
const STORE_LOGS = 'scan_logs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ROOMS)) {
        db.createObjectStore(STORE_ROOMS, { keyPath: 'roomId' });
      }
      if (!db.objectStoreNames.contains(STORE_BACKGROUNDS)) {
        db.createObjectStore(STORE_BACKGROUNDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRoomToCache(data: CachedRoomData): Promise<void> {
  // 1. Save to LocalStorage for quick synchronous recovery
  try {
    localStorage.setItem(`dandelion_room_${data.roomId}`, JSON.stringify(data));
    localStorage.setItem('dandelion_last_active_room', data.roomId);
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // 2. Save to IndexedDB for persistent robust cache
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ROOMS, 'readwrite');
    const store = tx.objectStore(STORE_ROOMS);
    store.put(data);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save warning:', err);
  }
}

export async function loadRoomFromCache(roomId: string): Promise<CachedRoomData | null> {
  // Try IndexedDB first
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ROOMS, 'readonly');
    const store = tx.objectStore(STORE_ROOMS);
    const result = await new Promise<CachedRoomData | undefined>((resolve, reject) => {
      const req = store.get(roomId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch (err) {
    console.warn('IndexedDB load fallback to LocalStorage:', err);
  }

  // Fallback to LocalStorage
  try {
    const local = localStorage.getItem(`dandelion_room_${roomId}`);
    if (local) {
      return JSON.parse(local);
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  return null;
}

export async function saveCustomBackgroundToCache(id: string, base64Data: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BACKGROUNDS, 'readwrite');
    const store = tx.objectStore(STORE_BACKGROUNDS);
    store.put({ id, data: base64Data, timestamp: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB custom background save error:', err);
  }
}

export async function loadCustomBackgroundFromCache(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BACKGROUNDS, 'readonly');
    const store = tx.objectStore(STORE_BACKGROUNDS);
    const result = await new Promise<{ id: string; data: string } | undefined>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result?.data || null;
  } catch (err) {
    console.warn('IndexedDB custom background load error:', err);
    return null;
  }
}

export async function saveEndingImageToCache(id: string, base64Data: string): Promise<void> {
  await saveCustomBackgroundToCache(`ending_${id}`, base64Data);
}

export async function loadEndingImageFromCache(id: string): Promise<string | null> {
  return loadCustomBackgroundFromCache(`ending_${id}`);
}

export async function addScanLog(roomId: string, seedNumber: number): Promise<void> {
  const entry: ScanLogEntry = {
    id: `${roomId}_${seedNumber}_${Date.now()}`,
    roomId,
    seedNumber,
    timestamp: Date.now(),
  };
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_LOGS);
    store.put(entry);
  } catch (err) {
    console.warn('Error recording scan log:', err);
  }
}

export async function clearRoomCache(roomId: string): Promise<void> {
  try {
    localStorage.removeItem(`dandelion_room_${roomId}`);
    const db = await openDB();
    const tx = db.transaction(STORE_ROOMS, 'readwrite');
    tx.objectStore(STORE_ROOMS).delete(roomId);
  } catch (err) {
    console.warn('Error clearing room cache:', err);
  }
}
