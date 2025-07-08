import { get } from '@vercel/edge-config';
import type { CacheEntry, Departure } from './types';

export class MapCache {
  private cache = new Map<string, CacheEntry>();

  async get(key: string): Promise<Departure[] | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Return null if data is older than 5 minutes
    if (Date.now() - entry.updatedAt > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  async set(key: string, data: Departure[]): Promise<void> {
    this.cache.set(key, {
      updatedAt: Date.now(),
      data
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getAllKeys(): string[] {
    const now = Date.now();
    const activeKeys: string[] = [];
    
    // Clean up expired entries and collect active keys
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.updatedAt > 5 * 60 * 1000) {
        // Delete expired entry
        this.cache.delete(key);
      } else {
        // Keep active entry
        activeKeys.push(key);
      }
    }
    
    return activeKeys;
  }
}

export class EdgeConfigCache {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(process.env.EDGE_CONFIG_ID && process.env.EDGE_CONFIG_TOKEN);
  }

  async get(key: string): Promise<Departure[] | null> {
    if (!this.isConfigured) return null;
    
    try {
      const entry = await get<CacheEntry>(key);
      if (!entry) return null;
      
      // Return null if data is older than 5 minutes
      if (Date.now() - entry.updatedAt > 5 * 60 * 1000) {
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.error('EdgeConfig get error:', error);
      return null;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Global instances
export const mapCache = new MapCache();
export const edgeConfigCache = new EdgeConfigCache();
