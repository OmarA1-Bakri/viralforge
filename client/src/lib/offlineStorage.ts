import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Network } from '@capacitor/network';

interface ViralForgeDB extends DBSchema {
  pendingRequests: {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
  };
  cachedContent: {
    key: string;
    value: {
      id: string;
      type: 'trend' | 'analysis' | 'clip';
      data: any;
      timestamp: number;
    };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<ViralForgeDB> | null = null;
  private syncInProgress = false;

  async init() {
    this.db = await openDB<ViralForgeDB>('viralforge-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingRequests')) {
          db.createObjectStore('pendingRequests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cachedContent')) {
          db.createObjectStore('cachedContent', { keyPath: 'id' });
        }
      },
    });

    // Listen for network changes
    Network.addListener('networkStatusChange', async (status) => {
      if (status.connected && !this.syncInProgress) {
        await this.syncPendingRequests();
      }
    });
  }

  async queueRequest(url: string, method: string, body: any) {
    if (!this.db) await this.init();

    const request = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      method,
      body,
      timestamp: Date.now(),
    };

    await this.db!.put('pendingRequests', request);
    console.log('Request queued for offline sync:', request.id);
  }

  async syncPendingRequests() {
    if (!this.db || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('🔄 Syncing pending requests...');

    try {
      const requests = await this.db.getAll('pendingRequests');

      for (const req of requests) {
        try {
          await fetch(req.url, {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
          });

          await this.db.delete('pendingRequests', req.id);
          console.log('✅ Synced request:', req.id);
        } catch (error) {
          console.error('Failed to sync request:', req.id, error);
        }
      }

      console.log(`✅ Sync complete. ${requests.length} requests processed.`);
    } finally {
      this.syncInProgress = false;
    }
  }

  async cacheContent(type: 'trend' | 'analysis' | 'clip', data: any) {
    if (!this.db) await this.init();

    const cached = {
      id: `${type}-${data.id || Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
    };

    await this.db!.put('cachedContent', cached);
  }

  async getCachedContent(type: 'trend' | 'analysis' | 'clip', maxAge: number = 3600000) {
    if (!this.db) await this.init();

    const allCached = await this.db!.getAll('cachedContent');
    const now = Date.now();

    return allCached
      .filter(c => c.type === type && (now - c.timestamp) < maxAge)
      .map(c => c.data);
  }
}

export const offlineStorage = new OfflineStorageService();
