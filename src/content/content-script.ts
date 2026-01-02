/**
 * SubZero Content Script
 *
 * Injected into YouTube's /feed/channels page.
 * Extracts subscription data via DOM scraping and communicates with the service worker.
 */

console.log('[SubZero] Content script loaded.');

/**
 * Extract subscription data from the rendered DOM.
 * Uses ytd-channel-renderer elements which contain channel info.
 */
function extractSubscriptionsFromDOM() {
  const channelElements = document.querySelectorAll('ytd-channel-renderer');

  console.log(`[SubZero] Found ${channelElements.length} channel elements in DOM.`);

  if (channelElements.length === 0) {
    console.warn('[SubZero] No channels found. Page may still be loading.');
    return [];
  }

  const subscriptions: Array<{
    id: string;
    title: string;
    handle: string;
    avatarUrl: string;
  }> = [];

  channelElements.forEach((el) => {
    try {
      // Channel ID from the link
      const link = el.querySelector('a#main-link') as HTMLAnchorElement | null;
      const href = link?.href || '';
      const channelId = href.split('/channel/')[1]?.split('?')[0] ||
        href.split('/@')[1]?.split('?')[0] || '';

      // Title
      const titleEl = el.querySelector('#channel-title, yt-formatted-string#text') as HTMLElement | null;
      const title = titleEl?.textContent?.trim() || 'Unknown';

      // Handle (from URL or subscriber count area)
      const handleEl = el.querySelector('#subscribers, #metadata yt-formatted-string') as HTMLElement | null;
      let handle = '';
      if (href.includes('/@')) {
        handle = '@' + href.split('/@')[1]?.split(/[/?]/)[0];
      }

      // Avatar
      const avatarEl = el.querySelector('img#img, yt-img-shadow img') as HTMLImageElement | null;
      const avatarUrl = avatarEl?.src || '';

      if (channelId || title !== 'Unknown') {
        subscriptions.push({
          id: channelId || `unknown-${subscriptions.length}`,
          title,
          handle: handle || handleEl?.textContent?.trim() || '',
          avatarUrl,
        });
      }
    } catch (e) {
      console.error('[SubZero] Error parsing channel element:', e);
    }
  });

  console.log(`[SubZero] Extracted ${subscriptions.length} subscriptions from DOM.`);
  return subscriptions;
}

/**
 * Send extracted subscriptions to the service worker.
 */
function sendSubscriptionsToBackground() {
  const subscriptions = extractSubscriptionsFromDOM();

  if (subscriptions.length > 0) {
    chrome.runtime.sendMessage({
      type: 'SUBSCRIPTIONS_EXTRACTED',
      payload: {
        subscriptions,
        continuationToken: null,
      },
    }, (response) => {
      console.log('[SubZero] Sent subscriptions to background:', response);
    });
  }
}

// Inject a floating "Launch SubZero" button
function injectLaunchButton() {
  if (document.getElementById('subzero-launch-button')) return;

  const button = document.createElement('button');
  button.id = 'subzero-launch-button';
  button.textContent = '🧊 SubZero';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  button.onmouseover = () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
  };
  button.onmouseout = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  };
  button.onclick = () => {
    // Extract data first, then open dashboard
    sendSubscriptionsToBackground();
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  };

  document.body.appendChild(button);
}

import { UnsubscribeQueue } from '@/lib/unsubscribe';
import type { UnsubscribeBatchPayload, ExtensionMessage, UnsubscribeProgressPayload } from '@/types';

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'UNSUBSCRIBE_BATCH') {
    handleUnsubscribeBatch(message.payload as UnsubscribeBatchPayload);
    sendResponse({ success: true });
  }
});

/**
 * Handle batch unsubscribe command from service worker.
 */
async function handleUnsubscribeBatch(payload: UnsubscribeBatchPayload) {
  console.log('[SubZero] Starting batch unsubscribe for', payload.channelIds.length, 'channels');

  const queue = new UnsubscribeQueue({
    onProgress: (completed, total, currentChannelId) => {
      const progressPayload: UnsubscribeProgressPayload = {
        processed: completed,
        total,
        currentChannelId,
        complete: false,
      };

      chrome.runtime.sendMessage({
        type: 'UNSUBSCRIBE_PROGRESS',
        payload: progressPayload,
      });
    },
    onComplete: (results) => {
      console.log('[SubZero] Batch unsubscribe complete', results);

      // Calculate overall stats
      const failed = results.filter(r => !r.success).length;

      const progressPayload: UnsubscribeProgressPayload = {
        processed: results.length,
        total: results.length,
        currentChannelId: '',
        complete: true,
        lastResult: failed > 0 ? { success: false, error: `${failed} failed` } : { success: true }
      };

      chrome.runtime.sendMessage({
        type: 'UNSUBSCRIBE_PROGRESS',
        payload: progressPayload,
      });
    }
  });

  queue.add(payload.channelIds);
  await queue.start();
}

// Initialize
injectLaunchButton();

