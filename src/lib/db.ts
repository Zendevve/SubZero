import Dexie, { type EntityTable } from 'dexie';
import type { Subscription } from '@/types';

/**
 * SubZero IndexedDB Database
 * Uses Dexie.js for a type-safe, promise-based API.
 */
class SubZeroDatabase extends Dexie {
  subscriptions!: EntityTable<Subscription, 'id'>;

  constructor() {
    super('SubZeroDatabase');
    this.version(1).stores({
      // Primary key is 'id'. Indexed fields: status, activityStatus, isSafeListed.
      subscriptions: 'id, status, activityStatus, isSafeListed, lastUpload',
    });
  }
}

export const db = new SubZeroDatabase();

/**
 * Upsert a list of subscriptions (insert or update).
 */
export async function upsertSubscriptions(subs: Subscription[]): Promise<void> {
  await db.transaction('rw', db.subscriptions, async () => {
    const existing = await db.subscriptions.bulkGet(subs.map((s) => s.id));
    const merged = subs.map((sub, i) => {
      const old = existing[i];
      if (!old) return sub;
      return {
        ...sub,
        // Critical: Preserve user preferences and expensive fetch data
        isSafeListed: old.isSafeListed,
        lastUpload: sub.lastUpload ?? old.lastUpload,
        activityStatus:
          sub.activityStatus === 'unknown' ? old.activityStatus : sub.activityStatus,
        fetchedAt: sub.fetchedAt ?? old.fetchedAt,
      };
    });
    await db.subscriptions.bulkPut(merged);
  });
}

/**
 * Get all subscriptions.
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.toArray();
}

/**
 * Update a single subscription's field(s).
 */
export async function updateSubscription(
  id: string,
  changes: Partial<Omit<Subscription, 'id'>>
): Promise<void> {
  await db.subscriptions.update(id, changes);
}

/**
 * Clear all subscriptions (for a fresh scan).
 */
export async function clearSubscriptions(): Promise<void> {
  await db.subscriptions.clear();
}
