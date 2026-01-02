/**
 * SubZero Type Definitions
 */

export type SubscriptionStatus = 'subscribed' | 'unsubscribed' | 'failed' | 'pending';

export type ActivityStatus = 'active' | 'dormant' | 'ghost' | 'unknown' | 'no-videos';

export interface Subscription {
  /** Channel ID (e.g., UCxxxxxx) */
  id: string;
  /** Channel display name */
  title: string;
  /** Channel handle (e.g., @channelname) */
  handle: string;
  /** URL to the channel's avatar image */
  avatarUrl: string;
  /** Epoch timestamp of last video upload (from RSS), null if unknown */
  lastUpload: number | null;
  /** User has marked this channel as protected */
  isSafeListed: boolean;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Activity status based on lastUpload */
  activityStatus: ActivityStatus;
  /** Epoch timestamp of when the RSS was last fetched */
  fetchedAt: number | null;
}

/**
 * Message types for communication between content script, service worker, and dashboard.
 */
export type MessageType =
  | 'SUBSCRIPTIONS_EXTRACTED'
  | 'FETCH_RSS'
  | 'RSS_RESULT'
  | 'UNSUBSCRIBE'
  | 'UNSUBSCRIBE_RESULT'
  | 'GET_ALL_SUBSCRIPTIONS'
  | 'SCAN_INACTIVITY'
  | 'OPEN_DASHBOARD';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
}

/**
 * Payload for SUBSCRIPTIONS_EXTRACTED message
 */
export interface SubscriptionsExtractedPayload {
  subscriptions: Omit<Subscription, 'lastUpload' | 'isSafeListed' | 'status' | 'activityStatus' | 'fetchedAt'>[];
  continuationToken: string | null;
}

/**
 * Payload for RSS_RESULT message
 */
export interface RssResultPayload {
  channelId: string;
  lastUpload: number | null;
  activityStatus: ActivityStatus;
  error?: string;
}
