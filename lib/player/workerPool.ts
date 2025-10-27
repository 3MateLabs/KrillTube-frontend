/**
 * Pool of Web Workers for parallel decryption
 * Utilizes multi-core CPUs for faster video segment processing
 *
 * Features:
 * - Round-robin worker distribution
 * - Promise-based API for async decryption
 * - Automatic worker lifecycle management
 * - Zero-copy buffer transfers
 */

'use client';

import type { DecryptMessage, DecryptResult } from './decryptionWorker';

export interface DecryptionTask {
  resolve: (data: Uint8Array) => void;
  reject: (error: Error) => void;
  startTime: number;
}

export class DecryptionWorkerPool {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private pendingTasks = new Map<string, DecryptionTask>();
  private totalDecryptions = 0;
  private totalDecryptionTime = 0;

  constructor(size: number = 4) {
    console.log(`[WorkerPool] Creating pool with ${size} workers...`);

    // Create worker pool (default: 4 workers for 4 parallel decryptions)
    for (let i = 0; i < size; i++) {
      try {
        // Create worker from decryptionWorker.ts
        const worker = new Worker(
          new URL('./decryptionWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e: MessageEvent<DecryptResult>) => {
          this.handleWorkerMessage(e.data);
        };

        worker.onerror = (error) => {
          console.error(`[WorkerPool] Worker ${i} error:`, error);
        };

        this.workers.push(worker);
        console.log(`[WorkerPool] ✓ Worker ${i} created`);
      } catch (error) {
        console.error(`[WorkerPool] Failed to create worker ${i}:`, error);
      }
    }

    if (this.workers.length === 0) {
      console.warn('[WorkerPool] No workers created! Falling back to main thread decryption');
    } else {
      console.log(`[WorkerPool] ✓ Pool initialized with ${this.workers.length} workers`);
    }
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(result: DecryptResult): void {
    const task = this.pendingTasks.get(result.id);

    if (!task) {
      console.warn(`[WorkerPool] Received result for unknown task: ${result.id}`);
      return;
    }

    const duration = performance.now() - task.startTime;
    this.totalDecryptions++;
    this.totalDecryptionTime += duration;

    if (result.error || !result.decryptedData) {
      task.reject(new Error(result.error || 'Decryption failed'));
    } else {
      task.resolve(result.decryptedData);
    }

    this.pendingTasks.delete(result.id);
  }

  /**
   * Decrypt segment using next available worker
   *
   * @param dek - Data Encryption Key (16 bytes)
   * @param encryptedData - Encrypted segment data
   * @param iv - Initialization Vector (12 bytes)
   * @returns Promise resolving to decrypted data
   */
  async decrypt(
    dek: Uint8Array,
    encryptedData: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    // If no workers available, fall back to main thread decryption
    if (this.workers.length === 0) {
      console.warn('[WorkerPool] No workers available, using main thread');
      const { aesGcmDecrypt } = await import('../crypto/primitives');
      return aesGcmDecrypt(dek, encryptedData, iv);
    }

    // Generate unique task ID
    const id = `decrypt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Select next worker (round-robin)
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;

    // Create promise for async result
    return new Promise<Uint8Array>((resolve, reject) => {
      this.pendingTasks.set(id, {
        resolve,
        reject,
        startTime: performance.now(),
      });

      // CRITICAL FIX: Copy buffers BEFORE transfer to avoid detachment issues
      // When transfer succeeds, original buffers become detached
      // If transfer fails, we need working copies for fallback
      const dekCopy = new Uint8Array(dek);
      const dataCopy = new Uint8Array(encryptedData);
      const ivCopy = new Uint8Array(iv);

      // Send decryption task to worker
      const message: DecryptMessage = {
        id,
        dek: dekCopy,
        encryptedData: dataCopy,
        iv: ivCopy,
      };

      try {
        // Try zero-copy transfer for performance (transfers ownership to worker)
        worker.postMessage(message, [
          dekCopy.buffer,
          dataCopy.buffer,
          ivCopy.buffer,
        ]);
      } catch (error) {
        // If transfer fails (e.g., buffer already detached), send without transfer
        // This creates copies of the data (slower but reliable)
        console.warn('[WorkerPool] Buffer transfer failed, sending copied data');
        worker.postMessage(message); // No transfer list = automatic cloning
      }
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      workerCount: this.workers.length,
      pendingTasks: this.pendingTasks.size,
      totalDecryptions: this.totalDecryptions,
      averageDecryptionTime:
        this.totalDecryptions > 0
          ? this.totalDecryptionTime / this.totalDecryptions
          : 0,
    };
  }

  /**
   * Check if worker pool is available
   */
  isAvailable(): boolean {
    return this.workers.length > 0;
  }

  /**
   * Terminate all workers and cleanup
   */
  destroy(): void {
    console.log('[WorkerPool] Destroying worker pool...');

    // Reject all pending tasks
    this.pendingTasks.forEach((task, id) => {
      task.reject(new Error('Worker pool destroyed'));
    });
    this.pendingTasks.clear();

    // Terminate all workers
    this.workers.forEach((worker, i) => {
      worker.terminate();
      console.log(`[WorkerPool] ✓ Worker ${i} terminated`);
    });

    this.workers = [];

    const stats = this.getStats();
    console.log('[WorkerPool] ✓ Pool destroyed');
    console.log(`[WorkerPool] Total decryptions: ${stats.totalDecryptions}`);
    console.log(`[WorkerPool] Average time: ${stats.averageDecryptionTime.toFixed(2)}ms`);
  }
}
