/**
 * Web Worker for parallel segment decryption
 * Offloads crypto operations from main thread to enable:
 * - Multi-core CPU utilization
 * - Non-blocking UI during decryption
 * - Parallel processing of multiple segments
 */

import { aesGcmDecrypt } from '../crypto/primitives';

export interface DecryptMessage {
  id: string;
  dek: Uint8Array;
  encryptedData: Uint8Array;
  iv: Uint8Array;
}

export interface DecryptResult {
  id: string;
  decryptedData: Uint8Array | null;
  error?: string;
}

// Worker message handler
self.onmessage = async (e: MessageEvent<DecryptMessage>) => {
  const { id, dek, encryptedData, iv } = e.data;

  try {
    console.log(`[DecryptionWorker] Decrypting segment ${id}...`);
    const startTime = performance.now();

    const decryptedData = await aesGcmDecrypt(dek, encryptedData, iv);

    const duration = performance.now() - startTime;
    console.log(`[DecryptionWorker] ✓ Decrypted ${id} in ${duration.toFixed(0)}ms`);

    const result: DecryptResult = {
      id,
      decryptedData,
    };

    // Transfer ownership of buffer back to main thread for zero-copy
    self.postMessage(result, { transfer: [decryptedData.buffer] });
  } catch (error) {
    console.error(`[DecryptionWorker] Failed to decrypt ${id}:`, error);

    const result: DecryptResult = {
      id,
      decryptedData: null,
      error: error instanceof Error ? error.message : 'Decryption failed',
    };

    self.postMessage(result);
  }
};

// Signal that worker is ready
console.log('[DecryptionWorker] Worker initialized and ready');
