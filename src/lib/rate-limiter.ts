import { RATE_LIMITER_CAPACITY, RATE_LIMITER_REFILL_RATE } from '@/constants';

/**
 * Leaky Bucket Rate Limiter
 *
 * Used to throttle RSS fetches to avoid 429 errors from YouTube.
 * - Capacity: Max tokens the bucket can hold.
 * - Refill Rate: Tokens added per second.
 *
 * Usage:
 *   const limiter = new RateLimiter();
 *   await limiter.acquire(); // Waits if bucket is empty
 *   // ... perform fetch ...
 */
export class RateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(
    capacity: number = RATE_LIMITER_CAPACITY,
    refillRate: number = RATE_LIMITER_REFILL_RATE
  ) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity; // Start full
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Acquire a token. Resolves immediately if available, otherwise waits.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // After waiting, refill and try again
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
    }
    // If still no token (edge case), it will be handled on next call.
  }

  /**
   * Get current token count (for debugging/UI).
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// Singleton instance for global usage
export const rateLimiter = new RateLimiter();
