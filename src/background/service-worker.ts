/**
 * SubZero Service Worker (MV3 Background)
 *
 * Handles:
 * - Receiving subscription data from content script
 * - Fetching RSS feeds (via offscreen document or direct fetch)
 * - Storing data in IndexedDB
 * - Opening the dashboard
 */

import { db, upsertSubscriptions, updateSubscription } from '@/lib/db';
import { rateLimiter } from '@/lib/rate-limiter';
import { fetchChannelRss, calculateActivityStatus } from '@/lib/rss-parser';
import type {
  Subscription,
  ExtensionMessage,
  SubscriptionsExtractedPayload,
  UnsubscribeBatchPayload,
  ToggleSafelistPayload,
} from '@/types';

console.log('[SubZero] Service worker started.');

// Listen for messages from content script and dashboard
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'SUBSCRIPTIONS_EXTRACTED':
        await handleSubscriptionsExtracted(message.payload as SubscriptionsExtractedPayload);
        sendResponse({ success: true });
        break;

      case 'OPEN_DASHBOARD':
        chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
        sendResponse({ success: true });
        break;

      case 'GET_ALL_SUBSCRIPTIONS':
        const subs = await db.subscriptions.toArray();
        sendResponse({ subscriptions: subs });
        break;

      case 'SCAN_INACTIVITY':
        await scanInactivity();
        sendResponse({ success: true });
        break;

      case 'UNSUBSCRIBE_BATCH':
        await handleUnsubscribeBatch(message.payload as UnsubscribeBatchPayload);
        sendResponse({ success: true });
        break;

      case 'UNSUBSCRIBE_PROGRESS':
        // Forward progress to all extension views (Dashboard)
        chrome.runtime.sendMessage(message).catch(() => {
          // Ignore error if no listeners (dashboard closed)
        });
        sendResponse({ success: true });
        break;

      case 'TOGGLE_SAFELIST':
        const { channelId, isSafeListed } = message.payload as ToggleSafelistPayload;
        await updateSubscription(channelId, { isSafeListed });
        sendResponse({ success: true });
        break;

      default:
        console.warn('[SubZero] Unknown message type:', message.type);
    }
  })();

  // Return true to indicate we will respond asynchronously
  return true;
});

/**
 * Handle incoming subscription data from content script.
 */
async function handleSubscriptionsExtracted(payload: SubscriptionsExtractedPayload) {
  console.log(`[SubZero] Processing ${payload.subscriptions.length} subscriptions.`);

  const fullSubs: Subscription[] = payload.subscriptions.map((sub) => ({
    id: sub.id,
    title: sub.title,
    handle: sub.handle,
    avatarUrl: sub.avatarUrl,
    lastUpload: null,
    isSafeListed: false,
    status: 'subscribed',
    activityStatus: 'unknown',
    fetchedAt: null,
  }));

  await upsertSubscriptions(fullSubs);
  console.log('[SubZero] Subscriptions saved to IndexedDB.');
}

/**
 * Scan all subscriptions for inactivity by fetching RSS feeds.
 */
async function scanInactivity() {
  const subs = await db.subscriptions.toArray();
  console.log(`[SubZero] Scanning ${subs.length} channels for inactivity...`);

  for (const sub of subs) {
    await rateLimiter.acquire();

    try {
      const result = await fetchChannelRss(sub.id);

      await db.subscriptions.update(sub.id, {
        lastUpload: result.lastUpload,
        activityStatus: result.lastUpload
          ? calculateActivityStatus(result.lastUpload)
          : result.activityStatus,
        fetchedAt: Date.now(),
      });

      console.log(`[SubZero] ${sub.title}: ${result.activityStatus}`);
    } catch (error) {
      console.error(`[SubZero] Error scanning ${sub.title}:`, error);
    }
  }

  console.log('[SubZero] Inactivity scan complete.');
}

// Keep service worker alive (MV3 workaround for long operations)
// This is a best-effort; Chrome may still terminate long-running workers.

/**
 * Handle batch unsubscribe command from dashboard.
 * Finds or creates a tab with the subscription manager and sends the command.
 */
async function handleUnsubscribeBatch(payload: UnsubscribeBatchPayload): Promise<void> {
  console.log(`[SubZero] Handling batch unsubscribe for ${payload.channelIds.length} channels.`);

  // 1. Check for existing YouTube tabs
  const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/feed/channels*' });
  let targetTabId: number;

  if (tabs.length > 0 && tabs[0].id) {
    targetTabId = tabs[0].id;
    // Make sure the tab is active
    await chrome.tabs.update(targetTabId, { active: true });
  } else {
    // 2. Open a new tab if none exist
    const tab = await chrome.tabs.create({ url: 'https://www.youtube.com/feed/channels', active: false });
    if (!tab.id) throw new Error('Failed to create tab');
    targetTabId = tab.id;

    // Wait for tab to load
    await new Promise<void>((resolve) => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === targetTabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Give content script a moment to initialize
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3. Send message to content script
  await chrome.tabs.sendMessage(targetTabId, {
    type: 'UNSUBSCRIBE_BATCH',
    payload,
  });

  console.log('[SubZero] Sent batch command to tab', targetTabId);
}
