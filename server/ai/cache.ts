// AI Response Cache Service - Optimizes token usage by caching AI responses
import { createHash } from "crypto";

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  tokensaved: number; // Estimated tokens saved by cache hits
}

export class AIResponseCache {
  private cache: Map<string, CacheEntry>;
  private stats: CacheStats;
  
  // Cache TTL settings (in milliseconds)
  private readonly TTL_TRENDS = 15 * 60 * 1000; // 15 minutes for trends
  private readonly TTL_CONTENT_ANALYSIS = 60 * 60 * 1000; // 1 hour for content analysis
  private readonly TTL_DEFAULT = 30 * 60 * 1000; // 30 minutes default
  
  // Estimated token counts for different operations
  private readonly TOKEN_ESTIMATES = {
    trendDiscovery: 500, // Estimated tokens per trend discovery request
    contentAnalysis: 300, // Estimated tokens per content analysis
    videoProcessing: 800, // Estimated tokens per video processing
  };

  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      tokensaved: 0,
    };
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(type: string, params: any): string {
    const normalizedParams = this.normalizeParams(params);
    const paramString = JSON.stringify(normalizedParams);
    const hash = createHash('sha256').update(paramString).digest('hex').slice(0, 16);
    return `${type}:${hash}`;
  }

  /**
   * Normalize parameters for consistent cache keys
   */
  private normalizeParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    // Sort object keys and normalize values
    const normalized: any = {};
    const sortedKeys = Object.keys(params).sort();
    
    for (const key of sortedKeys) {
      const value = params[key];
      if (typeof value === 'string') {
        normalized[key] = value.toLowerCase().trim();
      } else if (Array.isArray(value)) {
        normalized[key] = value.sort();
      } else {
        normalized[key] = value;
      }
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
      default:
        return this.TTL_DEFAULT;
    }
  }

  /**
   * Get cached response
   */
  get<T>(type: string, params: any): T | null {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);
    
    this.stats.totalRequests++;

    if (!entry || Date.now() > entry.expiresAt) {
      this.stats.misses++;
      if (entry) {
        this.cache.delete(key); // Clean up expired entry
      }
      return null;
    }

    // Update stats
    this.stats.hits++;
    entry.hitCount++;
    
    // Estimate tokens saved
    const tokenEstimate = this.TOKEN_ESTIMATES[type as keyof typeof this.TOKEN_ESTIMATES] || 200;
    this.stats.tokensaved += tokenEstimate;

    console.log(`✅ Cache HIT for ${type} (saved ~${tokenEstimate} tokens)`);
    return entry.data as T;
  }

  /**
   * Store response in cache
   */
  set(type: string, params: any, data: any): void {
    const key = this.generateCacheKey(type, params);
    const ttl = this.getTTL(type);
    const now = Date.now();

    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    console.log(`💾 Cached ${type} response (expires in ${Math.round(ttl / 60000)}m)`);
  }

  /**
   * Clear cache entries by type
   */
  clearByType(type: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${type}:`));
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for type: ${type}`);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { 
    hitRate: string;
    cacheSize: number;
    estimatedTokensSaved: number;
  } {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      estimatedTokensSaved: this.stats.tokensaved,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      tokensaved: 0,
    };
    console.log('🗑️ Cache cleared completely');
  }

  /**
   * Cache with user-specific context for personalized responses
   */
  getCachedWithUserContext<T>(type: string, params: any, userId?: string): T | null {
    const contextualParams = userId ? { ...params, userId } : params;
    return this.get<T>(type, contextualParams);
  }

  /**
   * Set cache with user-specific context
   */
  setCachedWithUserContext(type: string, params: any, data: any, userId?: string): void {
    const contextualParams = userId ? { ...params, userId } : params;
    this.set(type, contextualParams, data);
  }
}

// Global cache instance
export const aiCache = new AIResponseCache();