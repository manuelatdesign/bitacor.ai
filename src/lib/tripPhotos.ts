import type { GeneratedItinerary } from "../types";

export type TripPhotoSource = "camera" | "gallery" | "demo";

export interface TripPhoto {
  id: string;
  tripKey: string;
  backImage: string;
  frontImage?: string;
  lat: number;
  lng: number;
  locationName: string;
  time: string;
  note: string;
  source: TripPhotoSource;
  createdAt: number;
}

const DB_NAME = "bitacor_trip";
const DB_VERSION = 1;
const STORE = "photos";

export function getTripKey(itinerary: GeneratedItinerary): string {
  return `${itinerary.destinationTitle}::${itinerary.proposalType}::${itinerary.savedAt || itinerary.id || "unsaved"}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("tripKey", "tripKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadTripPhotos(tripKey: string): Promise<TripPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("tripKey");
    const req = idx.getAll(tripKey);
    req.onsuccess = () => {
      const rows = (req.result as TripPhoto[]) || [];
      rows.sort((a, b) => b.createdAt - a.createdAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveTripPhoto(photo: TripPhoto): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTripPhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Compress an image Blob/File to a JPEG data URL for IndexedDB storage. */
export async function compressToDataUrl(
  source: Blob | string,
  maxWidth = 1280,
  quality = 0.82
): Promise<string> {
  const blob =
    typeof source === "string"
      ? await (await fetch(source)).blob()
      : source;

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export function captureVideoFrame(video: HTMLVideoElement, quality = 0.85): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
