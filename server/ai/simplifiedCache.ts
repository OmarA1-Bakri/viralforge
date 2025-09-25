// Simplified Persistent AI Cache - Cost-optimized with reliable storage
import { createHash } from "crypto";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  type: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  tokensSaved: number;
}

export class SimplifiedAICache {
  private cacheDir: string;
  private statsFile: string;
  private stats: CacheStats;
  
  // Cache TTL settings (in milliseconds)
  private readonly TTL_TRENDS = 15 * 60 * 1000; // 15 minutes
  private readonly TTL_CONTENT_ANALYSIS = 60 * 60 * 1000; // 1 hour  
  private readonly TTL_VIDEO_PROCESSING = 45 * 60 * 1000; // 45 minutes
  private readonly TTL_DEFAULT = 30 * 60 * 1000; // 30 minutes
  
  // Accurate token estimates aligned with cache types
  private readonly TOKEN_ESTIMATES = {
    trends: 500,           
    content: 300,          
    videoProcessing: 800,  
    default: 200
  };

  constructor() {
    this.cacheDir = join(process.cwd(), '.cache', 'ai');
    this.statsFile = join(this.cacheDir, 'stats.json');
    this.stats = { hits: 0, misses: 0, totalRequests: 0, tokensSaved: 0 };
    
    this.initialize();
    
    // Clean expired entries every 10 minutes
    setInterval(() => this.cleanupExpired(), 10 * 60 * 1000);
  }

  private async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      if (!existsSync(this.cacheDir)) {
        await mkdir(this.cacheDir, { recursive: true });
      }
      
      // Load existing stats
      await this.loadStats();
      
      console.log('💾 Simplified AI cache initialized');
    } catch (error) {
      console.warn('Cache initialization warning:', error);
    }
  }

  /**
   * Generate secure cache key
   */
  private generateCacheKey(type: string, params: any): string {
    const normalizedParams = this.normalizeParams(params);
    const paramString = JSON.stringify(normalizedParams);
    const hash = createHash('sha256').update(paramString).digest('hex').slice(0, 20);
    return `${type}_${hash}.json`;
  }

  /**
   * Deep normalize parameters
   */
  private normalizeParams(params: any): any {
    if (params === null || typeof params !== 'object') {
      return typeof params === 'string' ? params.toLowerCase().trim() : params;
    }

    if (Array.isArray(params)) {
      return [...params].sort().map(item => this.normalizeParams(item));
    }

    const normalized: any = {};
    const sortedKeys = Object.keys(params).sort();
    
    for (const key of sortedKeys) {
      normalized[key] = this.normalizeParams(params[key]);
    }
    
    return normalized;
  }

  /**
   * Get TTL based on cache type
   */
  private getTTL(type: string): number {
    switch (type) {
      case 'trends':
        return this.TTL_TRENDS;
      case 'content':
        return this.TTL_CONTENT_ANALYSIS;
      case 'videoProcessing':
        return this.TTL_VIDEO_PROCESSING;
      default:
        return this.TTL_DEFAULT;
    }
  }

  /**
   * Load stats from disk
   */
  private async loadStats(): Promise<void> {
    try {
      if (existsSync(this.statsFile)) {
        const data = await readFile(this.statsFile, 'utf-8');
        this.stats = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load cache stats:', error);
      this.stats = { hits: 0, misses: 0, totalRequests: 0, tokensSaved: 0 };
    }
  }

  /**
   * Save stats to disk
   */
  private async saveStats(): Promise<void> {
    try {
      await writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.warn('Failed to save cache stats:', error);
    }
  }

  /**
   * Update stats and save periodically
   */
  private updateStats(type: 'hit' | 'miss', cacheType: string): void {
    this.stats.totalRequests++;
    
    if (type === 'hit') {
      this.stats.hits++;
      
      const tokenEstimate = this.TOKEN_ESTIMATES[cacheType as keyof typeof this.TOKEN_ESTIMATES] || this.TOKEN_ESTIMATES.default;
      this.stats.tokensSaved += tokenEstimate;
      
      console.log(`✅ Cache HIT for ${cacheType} (saved ~${tokenEstimate} tokens)`);
    } else {
      this.stats.misses++;
    }
    
    // Save stats every 5 requests
    if (this.stats.totalRequests % 5 === 0) {
      this.saveStats().catch(console.warn);
    }
  }

  /**
   * Get cached response
   */
  async get<T>(type: string, params: any): Promise<T | null> {
    const filename = this.generateCacheKey(type, params);
    const filepath = join(this.cacheDir, filename);
    
    try {
      if (!existsSync(filepath)) {
        this.updateStats('miss', type);
        return null;
      }

      const data = await readFile(filepath, 'utf-8');
      const entry: CacheEntry = JSON.parse(data);
      
      if (Date.now() > entry.expiresAt) {
        this.updateStats('miss', type);
        // Clean up expired file asynchronously
        import('fs').then(fs => fs.unlinkSync(filepath)).catch(() => {});
        return null;
      }

      // Update hit count
      entry.hitCount++;
      writeFile(filepath, JSON.stringify(entry, null, 2)).catch(console.warn);
      
      this.updateStats('hit', type);
      return entry.data as T;
      
    } catch (error) {
      this.updateStats('miss', type);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(type: string, params: any, data: any): Promise<void> {
    const filename = this.generateCacheKey(type, params);
    const filepath = join(this.cacheDir, filename);
    const ttl = this.getTTL(type);
    const now = Date.now();

    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      hitCount: 0,
      type,
    };

    try {
      await writeFile(filepath, JSON.stringify(entry, null, 2));
      console.log(`💾 Cached ${type} response (expires in ${Math.round(ttl / 60000)}m)`);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const { readdir, unlink, stat } = await import('fs/promises');
      
      if (!existsSync(this.cacheDir)) return;
      
      const files = await readdir(this.cacheDir);
      let cleanedCount = 0;
      const now = Date.now();
      
      for (const file of files) {
        if (file === 'stats.json') continue;
        
        const filepath = join(this.cacheDir, file);
        try {
          const fileData = await readFile(filepath, 'utf-8');
          const entry: CacheEntry = JSON.parse(fileData);
          
          if (now > entry.expiresAt) {
            await unlink(filepath);
            cleanedCount++;
          }
        } catch (error) {
          // Remove corrupted files
          await unlink(filepath).catch(() => {});
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired cache files`);
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats & { 
    hitRate: string;
    estimatedCostSaved: string;
    cacheType: string;
  } {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      estimatedCostSaved: `$${(this.stats.tokensSaved * 0.00015).toFixed(4)}`,
      cacheType: 'file-based-persistent'
    };
  }

  /**
   * Clear cache by type  
   */
  async clearByType(type: string): Promise<number> {
    try {
      const { readdir, unlink } = await import('fs/promises');
      
      if (!existsSync(this.cacheDir)) return 0;
      
      const files = await readdir(this.cacheDir);
      let clearedCount = 0;
      
      for (const file of files) {
        if (file === 'stats.json') continue;
        if (file.startsWith(`${type}_`)) {
          await unlink(join(this.cacheDir, file));
          clearedCount++;
        }
      }
      
      console.log(`🗑️ Cleared ${clearedCount} cache entries for type: ${type}`);
      return clearedCount;
    } catch (error) {
      console.warn('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const { readdir, unlink } = await import('fs/promises');
      
      if (!existsSync(this.cacheDir)) return;
      
      const files = await readdir(this.cacheDir);
      
      for (const file of files) {
        if (file === 'stats.json') continue;
        await unlink(join(this.cacheDir, file));
      }
      
      // Reset stats
      this.stats = { hits: 0, misses: 0, totalRequests: 0, tokensSaved: 0 };
      await this.saveStats();
      
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.warn('Cache clear all error:', error);
    }
  }

  /**
   * Get cache with user context (for personalized content)
   */
  async getCachedWithUserContext<T>(type: string, params: any, userId?: string): Promise<T | null> {
    // Only personalize content that truly benefits from it
    const shouldPersonalize = type === 'content' && userId && params.roastMode; // Only personalize roast mode
    const contextualParams = shouldPersonalize ? { ...params, userId } : params;
    return this.get<T>(type, contextualParams);
  }

  /**
   * Set cache with user context
   */
  async setCachedWithUserContext(type: string, params: any, data: any, userId?: string): Promise<void> {
    const shouldPersonalize = type === 'content' && userId && params.roastMode;
    const contextualParams = shouldPersonalize ? { ...params, userId } : params;
    await this.set(type, contextualParams, data);
  }
}

// Global simplified cache instance
export const simplifiedAICache = new SimplifiedAICache();