/**
 * SubZero Content Script
 *
 * Injected into YouTube's /feed/channels page.
 * Extracts ytInitialData and communicates with the service worker.
 */

console.log('[SubZero] Content script loaded.');

// Inject a script into the Main World to access window.ytInitialData
function injectMainWorldScript() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      function extractSubscriptions() {
        const ytInitialData = window.ytInitialData;
        if (!ytInitialData) {
          console.warn('[SubZero] ytInitialData not found.');
          return;
        }

        const subscriptions = [];

        try {
          const tabs = ytInitialData.contents?.twoColumnBrowseResultsRenderer?.tabs;
          if (!tabs) throw new Error('No tabs found');

          for (const tab of tabs) {
            const sections = tab.tabRenderer?.content?.sectionListRenderer?.contents;
            if (!sections) continue;

            for (const section of sections) {
              // Handle grid layout
              const gridItems = section.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items;
              if (gridItems) {
                for (const item of gridItems) {
                  const channel = item.gridChannelRenderer;
                  if (channel?.channelId) {
                    subscriptions.push({
                      id: channel.channelId,
                      title: channel.title?.simpleText || 'Unknown',
                      handle: channel.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace('/', '') || '',
                      avatarUrl: channel.thumbnail?.thumbnails?.[0]?.url || '',
                    });
                  }
                }
              }

              // Handle shelf/list layout
              const shelfItems = section.itemSectionRenderer?.contents?.[0]?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items;
              if (shelfItems) {
                for (const item of shelfItems) {
                  const channel = item.channelRenderer;
                  if (channel?.channelId) {
                    subscriptions.push({
                      id: channel.channelId,
                      title: channel.title?.simpleText || 'Unknown',
                      handle: channel.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace('/', '') || '',
                      avatarUrl: channel.thumbnail?.thumbnails?.[0]?.url || '',
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('[SubZero] Error extracting subscriptions:', e);
        }

        console.log('[SubZero] Extracted ' + subscriptions.length + ' subscriptions.');

        window.postMessage({
          type: 'SUBZERO_YT_INITIAL_DATA',
          payload: {
            subscriptions,
            continuationToken: null,
          },
        }, '*');
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', extractSubscriptions);
      } else {
        extractSubscriptions();
      }
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Listen for messages from the injected script (via window.postMessage)
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  if (event.data?.type === 'SUBZERO_YT_INITIAL_DATA') {
    console.log('[SubZero] Received ytInitialData from injected script.');
    // Forward to service worker
    chrome.runtime.sendMessage({
      type: 'SUBSCRIPTIONS_EXTRACTED',
      payload: event.data.payload,
    });
  }
});

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
    // Open the dashboard in a new tab
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
injectMainWorldScript();
injectLaunchButton();
