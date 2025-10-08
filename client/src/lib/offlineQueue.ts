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

/**
 * Add a failed sync to the offline queue
 */
export async function queueFailedSync(purchase: PendingSync): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(purchase);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log('[OfflineQueue] Queued failed sync:', purchase);
  } catch (error) {
    console.error('[OfflineQueue] Failed to queue sync:', error);
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
