/**
 * IndexedDB cache for transcoded video data
 * Uses file hash as key to ensure correct video is cached
 */

import type { TranscodeResult } from './clientTranscode';

const DB_NAME = 'KrillTubeTranscodeCache';
const DB_VERSION = 1;
const STORE_NAME = 'transcodedVideos';

/**
 * Generate SHA-256 hash of file for cache key
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export interface CachedTranscodeData {
  cacheKey: string; // Hash of file + quality settings
  fileHash: string; // SHA-256 hash of original file
  fileName: string;
  fileSize: number;
  qualities: string[];
  transcodedData: TranscodeResult;
  timestamp: number;
}

/**
 * Generate cache key from file hash and quality settings
 */
export function generateCacheKey(fileHash: string, qualities: string[]): string {
  return `${fileHash}_${qualities.sort().join('-')}`;
}

/**
 * Save transcoded data to cache
 */
export async function saveToCache(
  file: File,
  qualities: string[],
  transcodedData: TranscodeResult
): Promise<void> {
  try {
    console.log('[Cache] Generating file hash...');
    const fileHash = await generateFileHash(file);
    const cacheKey = generateCacheKey(fileHash, qualities);

    console.log('[Cache] Saving transcoded data to IndexedDB...');
    console.log(`  Cache Key: ${cacheKey}`);
    console.log(`  File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  Segments: ${transcodedData.segments.length}`);

    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cachedData: CachedTranscodeData = {
      cacheKey,
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      qualities,
      transcodedData,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => {
        console.log('[Cache] ✓ Saved to IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('[Cache] Failed to save to cache:', error);
    // Don't throw - caching is optional optimization
  }
}

/**
 * Load transcoded data from cache
 * Returns null if not found or file hash doesn't match
 */
export async function loadFromCache(
  file: File,
  qualities: string[]
): Promise<TranscodeResult | null> {
  try {
    console.log('[Cache] Checking for cached transcode...');
    console.log(`  File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  Qualities: ${qualities.join(', ')}`);

    const fileHash = await generateFileHash(file);
    const cacheKey = generateCacheKey(fileHash, qualities);

    console.log(`  Cache Key: ${cacheKey}`);

    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const cachedData = await new Promise<CachedTranscodeData | null>((resolve, reject) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!cachedData) {
      console.log('[Cache] ✗ No cached data found');
      return null;
    }

    // Verify file hash matches (ensure same video)
    if (cachedData.fileHash !== fileHash) {
      console.log('[Cache] ✗ File hash mismatch (different video)');
      return null;
    }

    // Verify file size matches (additional safety check)
    if (cachedData.fileSize !== file.size) {
      console.log('[Cache] ✗ File size mismatch');
      return null;
    }

    const age = Date.now() - cachedData.timestamp;
    const ageMinutes = Math.floor(age / 1000 / 60);

    console.log('[Cache] ✓ Found cached transcode!');
    console.log(`  Cached: ${ageMinutes} minutes ago`);
    console.log(`  Segments: ${cachedData.transcodedData.segments.length}`);

    return cachedData.transcodedData;
  } catch (error) {
    console.error('[Cache] Failed to load from cache:', error);
    return null;
  }
}

/**
 * Clear old cached data (older than maxAgeMs)
 */
export async function clearOldCache(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const cutoff = Date.now() - maxAgeMs;
    const request = index.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const data = cursor.value as CachedTranscodeData;
        if (data.timestamp < cutoff) {
          console.log(`[Cache] Deleting old cache: ${data.fileName} (${Math.floor((Date.now() - data.timestamp) / 1000 / 60 / 60)}h old)`);
          cursor.delete();
        }
        cursor.continue();
      }
    };

    db.close();
  } catch (error) {
    console.error('[Cache] Failed to clear old cache:', error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('[Cache] ✓ Cleared all cache');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
  }
}
