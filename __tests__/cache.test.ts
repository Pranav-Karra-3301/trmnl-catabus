import { MapCache } from '@/lib/cache';

describe('MapCache (string storage)', () => {
  let cache: MapCache;

  beforeEach(() => {
    cache = new MapCache();
  });

  it('stores and retrieves raw JSON strings', () => {
    const json = JSON.stringify({ hello: 'world' });
    cache.set('stop1', json);
    expect(cache.get('stop1')).toBe(json);
  });

  it('returns null for unknown keys', () => {
    expect(cache.get('nope')).toBeNull();
  });

  it('tracks keys correctly', () => {
    cache.set('a', '{}');
    cache.set('b', '{}');
    expect(cache.getAllStopIds().sort()).toEqual(['a', 'b']);
  });

  it('clears entries', () => {
    cache.set('x', '{}');
    cache.clear();
    expect(cache.size()).toBe(0);
  });
}); 