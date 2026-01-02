import { YOUTUBE_RSS_BASE_URL, RSS_FETCH_TIMEOUT_MS, ONE_YEAR_MS, SIX_MONTHS_MS, THIRTY_DAYS_MS } from '@/constants';
import type { ActivityStatus } from '@/types';

export interface RssParseResult {
  lastUpload: number | null;
  activityStatus: ActivityStatus;
  error?: string;
}

/**
 * Fetches and parses the RSS feed for a YouTube channel.
 * Returns the last upload date and activity status.
 *
 * @param channelId - The YouTube channel ID (e.g., UCxxxxxx)
 */
export async function fetchChannelRss(channelId: string): Promise<RssParseResult> {
  const url = `${YOUTUBE_RSS_BASE_URL}${channelId}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return { lastUpload: null, activityStatus: 'unknown', error: 'Feed not found (404)' };
      }
      return { lastUpload: null, activityStatus: 'unknown', error: `HTTP ${response.status}` };
    }

    const xmlText = await response.text();
    return parseRssXml(xmlText);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { lastUpload: null, activityStatus: 'unknown', error: 'Timeout' };
    }
    return { lastUpload: null, activityStatus: 'unknown', error: String(error) };
  }
}

/**
 * Parses RSS XML text and extracts the last upload date.
 */
function parseRssXml(xmlText: string): RssParseResult {
  // Use DOMParser (available in content scripts and offscreen docs, not service workers directly).
  // In a service worker, this would need an offscreen document or regex fallback.
  // For now, assume this runs in a context where DOMParser is available.

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { lastUpload: null, activityStatus: 'unknown', error: 'XML parse error' };
  }

  const entries = doc.querySelectorAll('entry');
  if (entries.length === 0) {
    return { lastUpload: null, activityStatus: 'no-videos' };
  }

  // First entry is the latest video
  const firstEntry = entries[0];
  const publishedElement = firstEntry.querySelector('published');

  if (!publishedElement?.textContent) {
    return { lastUpload: null, activityStatus: 'unknown', error: 'No published date' };
  }

  const lastUpload = new Date(publishedElement.textContent).getTime();
  const activityStatus = calculateActivityStatus(lastUpload);

  return { lastUpload, activityStatus };
}

/**
 * Determines activity status based on last upload date.
 */
export function calculateActivityStatus(lastUploadTimestamp: number | null): ActivityStatus {
  if (lastUploadTimestamp === null) {
    return 'unknown';
  }

  const now = Date.now();
  const age = now - lastUploadTimestamp;

  if (age > ONE_YEAR_MS) {
    return 'ghost';
  } else if (age > SIX_MONTHS_MS) {
    return 'dormant';
  } else if (age <= THIRTY_DAYS_MS) {
    return 'active';
  }

  // Between 30 days and 6 months: consider "active" but not highly active.
  // For simplicity, we treat anything <= 6 months as "active".
  return 'active';
}
