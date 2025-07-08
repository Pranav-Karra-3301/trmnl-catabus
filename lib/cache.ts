/**
 * In-memory cache backed by a simple `Map`.
 *
 * The cache stores the exact JSON string that will be returned by the API so
 * we avoid an extra `JSON.stringify` step in the stop handler. This also makes
 * deep‐cloning unnecessary and keeps the implementation edge-runtime friendly.
 */
export class MapCache {
  private cache = new Map<string, string>();

  /**
   * Get the cached JSON string for a stop, or `null` if it does not exist.
   */
  get(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  /**
   * Write a raw JSON string (already serialised) to the cache.
   */
  set(key: string, json: string): void {
    this.cache.set(key, json);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Current number of cached stops.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Convenience helper for diagnostics – returns every cached stopId.
   */
  getAllStopIds(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const cache = new MapCache();
