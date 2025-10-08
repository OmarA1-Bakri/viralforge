/**
 * Offline Purchase Queue
 *
 * Handles syncing purchases that failed due to network issues.
 * Automatically retries when the app comes back online.
 */

import { revenueCat } from './revenueCat';

interface PendingSync {
  productId: string;
  timestamp: number;
}

const QUEUE_KEY = 'pendingSyncs';
const MAX_QUEUE_SIZE = 10;
const MAX_RETRY_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Add a failed sync to the offline queue
 * Prevents unbounded growth with size limits and age-based cleanup
 */
export async function queueFailedSync(purchase: PendingSync): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as PendingSync[];

    // Remove old items (older than 7 days)
    const now = Date.now();
    const validQueue = queue.filter(item =>
      (now - item.timestamp) < MAX_RETRY_AGE_MS
    );

    // Check for duplicate (same productId)
    const existingIndex = validQueue.findIndex(
      item => item.productId === purchase.productId
    );

    if (existingIndex >= 0) {
      // Update timestamp instead of adding duplicate
      validQueue[existingIndex].timestamp = purchase.timestamp;
      console.log('[OfflineQueue] Updated existing queue item:', purchase.productId);
    } else {
      // Prevent unbounded growth
      if (validQueue.length >= MAX_QUEUE_SIZE) {
        console.warn('[OfflineQueue] Queue full, removing oldest item');
        validQueue.shift(); // Remove oldest
      }

      validQueue.push(purchase);
      console.log('[OfflineQueue] Queued failed sync:', purchase);
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(validQueue));
  } catch (error) {
    console.error('[OfflineQueue] Failed to queue sync:', error);

    // If localStorage is full, clear queue and try again
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[OfflineQueue] localStorage full, clearing old queue');
      localStorage.removeItem(QUEUE_KEY);
      localStorage.setItem(QUEUE_KEY, JSON.stringify([purchase]));
    }
  }
}

/**
 * Process all pending syncs
 */
export async function processPendingSyncs(): Promise<void> {
  try {
    const queue: PendingSync[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || '[]'
    );

    if (queue.length === 0) {
      return;
    }

    console.log(`[OfflineQueue] Processing ${queue.length} pending syncs...`);

    const remaining: PendingSync[] = [];

    for (const sync of queue) {
      try {
        await revenueCat.syncSubscriptionWithBackend();
        console.log('[OfflineQueue] Successfully synced:', sync);
      } catch (error) {
        console.warn('[OfflineQueue] Sync still failing, keeping in queue:', sync);
        remaining.push(sync);
      }
    }

    // Update queue with remaining syncs
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    if (remaining.length === 0) {
      console.log('[OfflineQueue] All syncs completed!');
    } else {
      console.log(`[OfflineQueue] ${remaining.length} syncs still pending`);
    }
  } catch (error) {
    console.error('[OfflineQueue] Error processing queue:', error);
  }
}

/**
 * Initialize offline queue system
 * Call this on app startup
 */
export function initOfflineQueue(): void {
  // Process pending syncs on app load
  processPendingSyncs();

  // Retry on network reconnect
  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Network reconnected, processing pending syncs...');
    processPendingSyncs();
  });

  console.log('[OfflineQueue] Offline queue system initialized');
}
