/**
 * SubZero Injected Script (Main World)
 *
 * This script runs in the page's main world, allowing access to `window.ytInitialData`.
 * It extracts subscription data and posts it back to the content script.
 */

interface YtInitialData {
  contents?: {
    twoColumnBrowseResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                itemSectionRenderer?: {
                  contents?: Array<{
                    shelfRenderer?: {
                      content?: {
                        expandedShelfContentsRenderer?: {
                          items?: Array<{
                            channelRenderer?: {
                              channelId: string;
                              title: { simpleText?: string };
                              navigationEndpoint?: {
                                browseEndpoint?: {
                                  canonicalBaseUrl?: string;
                                };
                              };
                              thumbnail?: {
                                thumbnails?: Array<{ url: string }>;
                              };
                            };
                          }>;
                        };
                      };
                    };
                    gridRenderer?: {
                      items?: Array<{
                        gridChannelRenderer?: {
                          channelId: string;
                          title: { simpleText?: string };
                          navigationEndpoint?: {
                            browseEndpoint?: {
                              canonicalBaseUrl?: string;
                            };
                          };
                          thumbnail?: {
                            thumbnails?: Array<{ url: string }>;
                          };
                        };
                      }>;
                    };
                  }>;
                };
              }>;
            };
          };
        };
      }>;
    };
  };
}

function extractSubscriptions() {
  const ytInitialData = (window as unknown as { ytInitialData?: YtInitialData }).ytInitialData;

  if (!ytInitialData) {
    console.warn('[SubZero] ytInitialData not found.');
    return;
  }

  const subscriptions: Array<{
    id: string;
    title: string;
    handle: string;
    avatarUrl: string;
  }> = [];

  // Navigate the nested structure to find channel renderers
  // This handles both list and grid layouts.
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

  console.log(`[SubZero] Extracted ${subscriptions.length} subscriptions.`);

  // Post back to content script
  window.postMessage(
    {
      type: 'SUBZERO_YT_INITIAL_DATA',
      payload: {
        subscriptions,
        continuationToken: null, // TODO: Extract continuation token for pagination
      },
    },
    '*'
  );
}

// Run extraction when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractSubscriptions);
} else {
  extractSubscriptions();
}
