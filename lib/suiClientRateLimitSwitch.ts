import { SuiClient } from "@mysten/sui/client";
import pLimit from "p-limit";

export class SuiClientRateLimitSwitch {
  private urls: string[];
  private currentIndex: number = 0;
  private clients: SuiClient[];
  private limiter: ReturnType<typeof pLimit>;

  // Monitoring
  private requestCount = 0;
  private rotationCount = 0;
  private lastLogTime = Date.now();

  constructor(urls: string[], maxConcurrent: number = 15) {
    // Filter out undefined/empty URLs
    const validUrls = urls.filter(url => url && url.length > 0);

    if (validUrls.length === 0) {
      throw new Error("At least one valid RPC URL is required");
    }

    this.urls = validUrls;
    this.clients = validUrls.map(url => new SuiClient({ url }));

    // Initialize concurrency limiter
    // 15 concurrent requests max = 10 endpoints * 1.5 safety margin
    this.limiter = pLimit(maxConcurrent);
    console.log(`[RateLimitSwitch] Max concurrent requests: ${maxConcurrent}`);
    
    // Create a proxy to forward all method calls
    return new Proxy(this, {
      get(target, prop: string | symbol) {
        // If the property exists on the wrapper, return it
        if (prop in target) {
          return (target as any)[prop];
        }
        
        // Otherwise, try to get it from the current client
        const client = target.getCurrentClient();
        const value = (client as any)[prop];
        
        // If it's not a function, return as-is
        if (typeof value !== 'function') {
          return value;
        }
        
        // If it's a function, wrap it with retry logic AND concurrency control
        return (...args: any[]) => {
          return target.limiter(() =>
            target.executeWithRetry(async (client) => {
              const fn = (client as any)[prop];
              if (typeof fn !== 'function') {
                throw new Error(`${String(prop)} is not a function on SuiClient`);
              }
              return fn.apply(client, args);
            })
          );
        };
      }
    }) as any;
  }

  private async executeWithRetry<T>(
    operation: (client: SuiClient) => Promise<T>
  ): Promise<T> {
    const startIndex = this.currentIndex;
    let lastError: Error | null = null;
    let attempts = 0;

    // Increment request counter
    this.requestCount++;

    // Log stats every 10 seconds
    const now = Date.now();
    if (now - this.lastLogTime > 10000) {
      console.log(`[RateLimitSwitch] Stats: ${this.requestCount} requests, ${this.rotationCount} rotations`);
      this.lastLogTime = now;
    }

    // Try each URL once
    for (let i = 0; i < this.urls.length; i++) {
      const client = this.clients[this.currentIndex];

      try {
        const result = await operation(client);
        return result;
      } catch (error: any) {
        lastError = error;

        // Enhanced 429 detection - check multiple places where it might be hidden
        const errorString = JSON.stringify(error);
        const isFetchFailure = error?.message === 'Failed to fetch' || error?.message === 'Load failed';
        const is429 = error?.response?.status === 429 ||
                      error?.status === 429 ||
                      error?.statusCode === 429 ||
                      (error?.message && (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('rate limit'))) ||
                      errorString.includes('429') ||
                      errorString.includes('Too Many Requests') ||
                      isFetchFailure;

        console.log(`[RateLimitSwitch] Error on endpoint ${this.currentIndex + 1}:`, {
          status: error?.status,
          statusCode: error?.statusCode,
          message: error?.message?.slice(0, 100),
          is429
        });

        if (is429) {
          this.rotationCount++;
          console.log(`[RateLimitSwitch] ⚠️  Rate limit detected! Rotating to endpoint ${(this.currentIndex + 1) % this.urls.length + 1}/${this.urls.length}`);
          this.currentIndex = (this.currentIndex + 1) % this.urls.length;
          attempts++;
        } else {
          // For non-rate-limit errors, throw immediately
          console.log(`[RateLimitSwitch] ❌ Non-rate-limit error, throwing...`);
          throw error;
        }
      }
    }

    // All URLs hit rate limits - use exponential backoff
    console.log("[RateLimitSwitch] All endpoints exhausted. Using exponential backoff...");

    let backoffTime = 2000; // Start with 2 seconds
    const maxBackoff = 32000; // Max 32 seconds
    const maxRetries = 5;

    for (let retry = 0; retry < maxRetries; retry++) {
      console.log(`[RateLimitSwitch] Retry ${retry + 1}/${maxRetries}, waiting ${backoffTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));

      // Reset to the starting index for retry
      this.currentIndex = startIndex;

      try {
        const result = await operation(this.clients[this.currentIndex]);
        console.log(`[RateLimitSwitch] Retry successful after ${backoffTime}ms wait`);
        return result;
      } catch (error: any) {
        const isFetchFailure = error?.message === 'Failed to fetch' || error?.message === 'Load failed';
        const is429 = error?.response?.status === 429 || error?.status === 429 ||
                      (error?.message && (error.message.includes('429') || error.message.includes('rate limit'))) ||
                      isFetchFailure;

        if (!is429) {
          // Not a rate limit error, throw immediately
          throw error;
        }

        // Still rate limited, increase backoff exponentially
        backoffTime = Math.min(backoffTime * 2, maxBackoff);
      }
    }

    // If still failing after all retries, throw the last error
    throw lastError || new Error("All rate limit retries exhausted");
  }

  // Get the current client for operations that need direct access
  getCurrentClient(): SuiClient {
    return this.clients[this.currentIndex];
  }
}

// Factory function to create SuiClient with rate limit handling for mainnet
export function createSuiClientWithRateLimitHandling(): SuiClient {
  const urls = [
    "https://fullnode.mainnet.sui.io:443",
    "https://mainnet.suiet.app",
    "https://rpc-mainnet.suiscan.xyz",
    "https://mainnet.sui.rpcpool.com",
    "https://sui-mainnet.nodeinfra.com",
    "https://mainnet-rpc.sui.chainbase.online",
    "https://sui-mainnet-ca-1.cosmostation.io",
    "https://sui-mainnet-ca-2.cosmostation.io",
    "https://sui-mainnet-us-1.cosmostation.io",
    "https://sui-mainnet-us-2.cosmostation.io",
  ];

  // Remove duplicates
  const uniqueUrls = Array.from(new Set(urls));

  console.log(`[RateLimitSwitch] Initializing with ${uniqueUrls.length} RPC endpoints:`, uniqueUrls);

  return new SuiClientRateLimitSwitch(uniqueUrls) as any as SuiClient;
}