/**
 * SubZero Constants
 * All magic literals centralized here.
 */

// --- URLs ---
export const YOUTUBE_SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/channels';
export const YOUTUBE_RSS_BASE_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
export const YOUTUBE_BROWSE_ENDPOINT = 'https://www.youtube.com/youtubei/v1/browse';

// --- Timeouts (ms) ---
export const DEFAULT_UNSUBSCRIBE_DELAY_MS = 2500;
export const UNSUBSCRIBE_JITTER_MS = 500; // +/- random variance
export const RSS_FETCH_TIMEOUT_MS = 10000;
export const MODAL_WAIT_TIMEOUT_MS = 3000;

// --- Rate Limiter (Leaky Bucket) ---
export const RATE_LIMITER_CAPACITY = 20;
export const RATE_LIMITER_REFILL_RATE = 5; // tokens per second

// --- Inactivity Thresholds (ms) ---
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// --- DOM Selectors (Best-effort, with fallbacks) ---
// These are inherently fragile. The ytInitialData approach is preferred.
export const SELECTORS = {
  SUBSCRIBED_BUTTON: 'ytd-subscribe-button-renderer button, tp-yt-paper-button.ytd-subscribe-button-renderer',
  UNSUBSCRIBE_CONFIRM_BUTTON: '#confirm-button, yt-button-renderer[dialog-confirm] button',
  TOAST_NOTIFICATION: 'tp-yt-paper-toast, ytd-popup-container',
};
