/**
 * SubZero Unsubscribe Engine
 *
 * Handles the DOM automation for unsubscribing from channels.
 * Uses MutationObserver to detect confirmation modals and
 * randomized delays (jitter) for anti-detection.
 */

import {
  DEFAULT_UNSUBSCRIBE_DELAY_MS,
  UNSUBSCRIBE_JITTER_MS,
  MODAL_WAIT_TIMEOUT_MS,
  SELECTORS,
} from '@/constants';

export interface UnsubscribeResult {
  channelId: string;
  success: boolean;
  error?: string;
}

/**
 * Generates a random delay using Box-Muller transform for normal distribution.
 * This creates more "human-like" timing than uniform random.
 */
function getRandomDelay(mean: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const delay = mean + z * stdDev;
  // Clamp to positive values
  return Math.max(500, delay);
}

/**
 * Waits for an element to appear in the DOM using MutationObserver.
 */
function waitForElement(
  selector: string,
  timeout: number = MODAL_WAIT_TIMEOUT_MS
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Simulates a mouse click event that appears more "trusted".
 * Uses MouseEvent with proper event properties.
 */
function simulateClick(element: Element): void {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
  });

  const mouseUpEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
  });

  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
  });

  element.dispatchEvent(mouseDownEvent);
  element.dispatchEvent(mouseUpEvent);
  element.dispatchEvent(clickEvent);
}

/**
 * Finds the "Subscribed" button for a specific channel.
 * This is called from the channel page or list context.
 */
function findSubscribedButton(): Element | null {
  const buttons = document.querySelectorAll(SELECTORS.SUBSCRIBED_BUTTON);

  for (const button of buttons) {
    // Look for button that indicates "subscribed" state
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

    if (
      text.includes('subscribed') ||
      ariaLabel.includes('subscribed') ||
      button.querySelector('[subscribed]')
    ) {
      return button;
    }
  }

  return null;
}

/**
 * Executes unsubscribe action for the current channel page.
 * Returns a promise that resolves when the action is complete.
 */
export async function executeUnsubscribe(channelId: string): Promise<UnsubscribeResult> {
  try {
    // Step 1: Find and click the "Subscribed" button
    const subscribedButton = findSubscribedButton();
    if (!subscribedButton) {
      return { channelId, success: false, error: 'Subscribed button not found' };
    }

    simulateClick(subscribedButton);

    // Step 2: Wait for confirmation modal to appear
    const confirmButton = await waitForElement(SELECTORS.UNSUBSCRIBE_CONFIRM_BUTTON);
    if (!confirmButton) {
      return { channelId, success: false, error: 'Confirmation modal did not appear' };
    }

    // Small delay before clicking confirm (more human-like)
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

    // Step 3: Click the confirm button
    simulateClick(confirmButton);

    // Step 4: Wait for toast/success indicator
    await new Promise((r) => setTimeout(r, 500));

    return { channelId, success: true };
  } catch (error) {
    return {
      channelId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Unsubscribe Queue Manager
 * Handles batch unsubscription with rate limiting and jitter.
 */
export class UnsubscribeQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private isPaused = false;
  private onProgress?: (completed: number, total: number, current: string) => void;
  private onComplete?: (results: UnsubscribeResult[]) => void;
  private results: UnsubscribeResult[] = [];

  constructor(options?: {
    onProgress?: (completed: number, total: number, current: string) => void;
    onComplete?: (results: UnsubscribeResult[]) => void;
  }) {
    this.onProgress = options?.onProgress;
    this.onComplete = options?.onComplete;
  }

  /**
   * Add channel IDs to the queue.
   */
  add(channelIds: string[]): void {
    this.queue.push(...channelIds);
  }

  /**
   * Start processing the queue.
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.results = [];

    const total = this.queue.length;
    let completed = 0;

    while (this.queue.length > 0) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      const channelId = this.queue.shift()!;
      this.onProgress?.(completed, total, channelId);

      // Navigate to channel page and execute unsubscribe
      // In a real implementation, this would need to navigate or use the current page context
      const result = await executeUnsubscribe(channelId);
      this.results.push(result);

      completed++;
      this.onProgress?.(completed, total, channelId);

      // Random delay between actions
      if (this.queue.length > 0) {
        const delay = getRandomDelay(DEFAULT_UNSUBSCRIBE_DELAY_MS, UNSUBSCRIBE_JITTER_MS);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    this.isProcessing = false;
    this.onComplete?.(this.results);
  }

  /**
   * Pause the queue.
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the queue.
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Cancel and clear the queue.
   */
  cancel(): void {
    this.queue = [];
    this.isProcessing = false;
    this.isPaused = false;
  }

  /**
   * Get queue status.
   */
  getStatus(): { remaining: number; isProcessing: boolean; isPaused: boolean } {
    return {
      remaining: this.queue.length,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
    };
  }
}
