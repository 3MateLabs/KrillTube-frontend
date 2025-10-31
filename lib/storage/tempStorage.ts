/**
 * Temporary storage using IndexedDB for large video processing
 *
 * Prevents "memory access out of bounds" errors by storing segments
 * in IndexedDB instead of keeping everything in memory.
 */

'use client';

const DB_NAME = 'KrillTubeTemp';
const DB_VERSION = 1;
const STORE_NAME = 'videoSegments';

export interface StoredSegment {
  id: string; // e.g., "videoId_720p_seg_0"
  videoId: string;
  quality: string;
  segIdx: number;
  type: 'init' | 'media';
  data: Uint8Array;
  duration: number;
  timestamp: number;
}

class TempStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[TempStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[TempStorage] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('videoId', 'videoId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[TempStorage] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Store a segment in IndexedDB
   */
  async storeSegment(segment: StoredSegment): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(segment);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[TempStorage] Failed to store segment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve a segment from IndexedDB
   */
  async getSegment(id: string): Promise<StoredSegment | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error('[TempStorage] Failed to get segment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a single segment by ID
   */
  async deleteSegment(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[TempStorage] Failed to delete segment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all segments for a video
   */
  async getVideoSegments(videoId: string): Promise<StoredSegment[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('videoId');
      const request = index.getAll(videoId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.error('[TempStorage] Failed to get video segments:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete all segments for a video (cleanup)
   */
  async deleteVideoSegments(videoId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const segments = await this.getVideoSegments(videoId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let deleted = 0;
      segments.forEach((segment) => {
        const request = store.delete(segment.id);
        request.onsuccess = () => {
          deleted++;
          if (deleted === segments.length) {
            console.log(`[TempStorage] Deleted ${deleted} segments for video ${videoId}`);
            resolve();
          }
        };
        request.onerror = () => {
          console.error('[TempStorage] Failed to delete segment:', request.error);
        };
      });

      if (segments.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Clear old segments (older than 1 hour)
   */
  async clearOldSegments(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let deleted = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.value.timestamp < oneHourAgo) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          console.log(`[TempStorage] Cleared ${deleted} old segments`);
          resolve();
        }
      };

      request.onerror = () => {
        console.error('[TempStorage] Failed to clear old segments:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }
}

// Singleton instance
export const tempStorage = new TempStorage();

/**
 * Initialize temp storage and clear old data on app start
 */
export async function initTempStorage(): Promise<void> {
  try {
    await tempStorage.init();
    await tempStorage.clearOldSegments();

    const estimate = await tempStorage.getStorageEstimate();
    const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
    const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
    console.log(`[TempStorage] Storage: ${usageMB}MB used of ${quotaMB}MB quota`);
  } catch (error) {
    console.error('[TempStorage] Initialization failed:', error);
  }
}
