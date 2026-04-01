/**
 * IndexedDB layer for storing pending audio recordings offline.
 * Database: visit-offline-db, Store: pending-recordings
 */

export interface PendingRecording {
  id: string;
  visitId: string;
  clientName: string;
  visitDate: string;
  audioBlob: Blob;
  uploadedPath?: string;
  createdAt: string;
  status: "pending" | "syncing";
}

const DB_NAME = "visit-offline-db";
const STORE_NAME = "pending-recordings";
const DB_VERSION = 1;
const CHANGE_EVENT = "offline-recordings-changed";

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onRecordingsChange(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingRecording(
  recording: Omit<PendingRecording, "id" | "createdAt" | "status">
): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const entry: PendingRecording = {
    ...recording,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => { db.close(); notifyChange(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingRecordings(): Promise<PendingRecording[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function updateRecordingStatus(
  id: string,
  status: PendingRecording["status"]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, status });
      }
    };
    tx.oncomplete = () => { db.close(); notifyChange(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function updatePendingRecording(
  id: string,
  patch: Partial<Omit<PendingRecording, "id">>
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...patch, id });
      }
    };
    tx.oncomplete = () => { db.close(); notifyChange(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deletePendingRecording(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); notifyChange(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
