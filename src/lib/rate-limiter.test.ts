import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    // 5 tokens capacity, 1 token per second refill
    limiter = new RateLimiter(5, 1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with full capacity', () => {
    expect(limiter.getTokens()).toBe(5);
  });

  it('consumes tokens correctly', async () => {
    await limiter.acquire();
    expect(limiter.getTokens()).toBeCloseTo(4);
  });

  it('refills tokens over time', async () => {
    await limiter.acquire(); // 4 left
    await limiter.acquire(); // 3 left
    expect(limiter.getTokens()).toBeCloseTo(3);

    // Advance 1 second
    vi.advanceTimersByTime(1000);
    expect(limiter.getTokens()).toBeCloseTo(4);

    // Advance another second
    vi.advanceTimersByTime(1000);
    expect(limiter.getTokens()).toBeCloseTo(5);
  });

  it('does not exceed capacity', async () => {
    await limiter.acquire();
    vi.advanceTimersByTime(10000); // Wait long enough to overfill
    expect(limiter.getTokens()).toBe(5);
  });

  it('throttles when empty', async () => {
    // Consume all 5 tokens
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    expect(limiter.getTokens()).toBeCloseTo(0);

    // Initial acquire should be blocked
    const acquirePromise = limiter.acquire();

    // Should not resolve yet
    let resolved = false;
    acquirePromise.then(() => { resolved = true; });
    await Promise.resolve(); // Flush microtasks
    expect(resolved).toBe(false);

    // Advance 1 second (enough for 1 token)
    vi.advanceTimersByTime(1000);

    // Ensure the pending acquire finishes and consumes the token
    await acquirePromise;
    expect(resolved).toBe(true);

    // Now it should be empty again
    expect(limiter.getTokens()).toBeCloseTo(0);
  });
});
