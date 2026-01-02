/**
 * SubZero Unsubscribe Engine (REWRITTEN)
 *
 * Based on reference repos pattern:
 * 1. Find ytd-channel-renderer elements on /feed/channels page
 * 2. Click the unsubscribe button within each
 * 3. Click confirm in the modal
 * 4. Repeat with delays
 */

// Selectors from reference repos
const UNSUBSCRIBE_SELECTORS = [
  '[aria-label^="Unsubscribe from"]',
  '#subscribe-button button[aria-label*="Unsubscribe"]',
  'ytd-subscribe-button-renderer button[aria-label*="Unsubscribe"]',
];

const CONFIRM_SELECTORS = [
  'yt-confirm-dialog-renderer #confirm-button button',
  '#confirm-button button',
  'yt-confirm-dialog-renderer button.yt-button-renderer',
  'paper-dialog #confirm-button button',
];

/**
 * Sleep helper function.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find the unsubscribe button within a channel element.
 */
function findUnsubscribeButton(channelEl: Element): HTMLElement | null {
  for (const selector of UNSUBSCRIBE_SELECTORS) {
    const btn = channelEl.querySelector(selector) as HTMLElement | null;
    if (btn) return btn;
  }
  return null;
}

/**
 * Find and click the confirm button in the modal.
 */
async function clickConfirmButton(): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const selector of CONFIRM_SELECTORS) {
      const btn = document.querySelector(selector) as HTMLElement | null;
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    await sleep(200);
  }
  return false;
}

export interface UnsubscribeResult {
  channelId: string;
  success: boolean;
  error?: string;
}

export interface UnsubscribeQueueOptions {
  onProgress?: (completed: number, total: number, current: string) => void;
  onComplete?: (results: UnsubscribeResult[]) => void;
}

/**
 * Process unsubscribe for a list of channel IDs.
 * Must be run on the /feed/channels page with all channels loaded.
 */
export async function processUnsubscribe(
  channelIds: string[],
  options?: UnsubscribeQueueOptions
): Promise<UnsubscribeResult[]> {
  const results: UnsubscribeResult[] = [];
  const total = channelIds.length;
  let completed = 0;

  // Get all channel elements
  const channelElements = document.querySelectorAll('ytd-channel-renderer');
  console.log(`[SubZero] Found ${channelElements.length} channel elements on page`);

  // Build a map of channel ID -> element
  const channelMap = new Map<string, Element>();
  channelElements.forEach((el) => {
    const link = el.querySelector('a#main-link') as HTMLAnchorElement | null;
    const href = link?.href || '';
    const id = href.split('/channel/')[1]?.split('?')[0] ||
      href.split('/@')[1]?.split(/[/?]/)[0] || '';
    if (id) {
      channelMap.set(id, el);
    }
  });

  console.log(`[SubZero] Mapped ${channelMap.size} channels`);

  for (const channelId of channelIds) {
    options?.onProgress?.(completed, total, channelId);

    const channelEl = channelMap.get(channelId);
    if (!channelEl) {
      console.warn(`[SubZero] Channel ${channelId} not found on page`);
      results.push({ channelId, success: false, error: 'Not found on page' });
      completed++;
      continue;
    }

    // Scroll element into view
    channelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);

    // Find and click unsubscribe button
    const unsubBtn = findUnsubscribeButton(channelEl);
    if (!unsubBtn) {
      console.warn(`[SubZero] Unsubscribe button not found for ${channelId}`);
      results.push({ channelId, success: false, error: 'Button not found' });
      completed++;
      continue;
    }

    console.log(`[SubZero] Clicking unsubscribe for ${channelId}`);
    unsubBtn.click();
    await sleep(1000);

    // Click confirm button
    const confirmed = await clickConfirmButton();
    if (!confirmed) {
      console.warn(`[SubZero] Confirm button not found for ${channelId}`);
      results.push({ channelId, success: false, error: 'Confirm failed' });
      completed++;
      continue;
    }

    console.log(`[SubZero] Successfully unsubscribed from ${channelId}`);
    results.push({ channelId, success: true });
    completed++;
    options?.onProgress?.(completed, total, channelId);

    // Delay between actions (2 seconds like reference repos)
    if (completed < total) {
      await sleep(2000);
    }
  }

  options?.onComplete?.(results);
  return results;
}

/**
 * Queue wrapper for backward compatibility.
 */
export class UnsubscribeQueue {
  private channelIds: string[] = [];
  private options: UnsubscribeQueueOptions;

  constructor(options?: UnsubscribeQueueOptions) {
    this.options = options || {};
  }

  add(channelIds: string[]): void {
    this.channelIds.push(...channelIds);
  }

  async start(): Promise<void> {
    await processUnsubscribe(this.channelIds, this.options);
  }
}
