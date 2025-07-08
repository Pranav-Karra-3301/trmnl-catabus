import { MapCache } from '@/lib/cache';
import type { Departure } from '@/lib/types';

describe('MapCache', () => {
  let cache: MapCache;

  beforeEach(() => {
    cache = new MapCache();
  });

  it('should store and retrieve data', async () => {
    const mockDepartures: Departure[] = [
      {
        routeId: 'ROUTE1',
        routeShortName: 'ROUTE1',
        tripId: 'trip_123',
        stopId: 'STOP1',
        scheduledTime: Date.now() + 300000,
        predictedTime: Date.now() + 360000,
        delay: 60
      }
    ];

    await cache.set('test-key', mockDepartures);
    const result = await cache.get('test-key');

    expect(result).toEqual(mockDepartures);
  });

  it('should return null for non-existent keys', async () => {
    const result = await cache.get('non-existent');
    expect(result).toBeNull();
  });

  it('should return null for expired data', async () => {
    const mockDepartures: Departure[] = [
      {
        routeId: 'ROUTE1',
        routeShortName: 'ROUTE1',
        tripId: 'trip_123',
        stopId: 'STOP1',
        scheduledTime: Date.now() + 300000,
        predictedTime: Date.now() + 360000,
        delay: 60
      }
    ];

    // Manually set expired data
    const expiredTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    (cache as any).cache.set('expired-key', {
      updatedAt: expiredTime,
      data: mockDepartures
    });

    const result = await cache.get('expired-key');
    expect(result).toBeNull();
  });

  it('should clear all data', async () => {
    const mockDepartures: Departure[] = [
      {
        routeId: 'ROUTE1',
        routeShortName: 'ROUTE1',
        tripId: 'trip_123',
        stopId: 'STOP1',
        scheduledTime: Date.now() + 300000,
        predictedTime: Date.now() + 360000,
        delay: 60
      }
    ];

    await cache.set('test-key', mockDepartures);
    expect(cache.size()).toBe(1);

    cache.clear();
    expect(cache.size()).toBe(0);
    
    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });

  it('should only return active keys and clean up expired ones', async () => {
    const mockDepartures: Departure[] = [
      {
        routeId: 'ROUTE1',
        routeShortName: 'ROUTE1',
        tripId: 'trip_123',
        stopId: 'STOP1',
        scheduledTime: Date.now() + 300000,
        predictedTime: Date.now() + 360000,
        delay: 60
      }
    ];

    // Add active data
    await cache.set('active-key', mockDepartures);
    
    // Add expired data
    const expiredTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    (cache as any).cache.set('expired-key', {
      updatedAt: expiredTime,
      data: mockDepartures
    });

    // Should have 2 items before cleanup
    expect(cache.size()).toBe(2);

    // getAllKeys should clean up expired and return only active
    const keys = cache.getAllKeys();
    expect(keys).toEqual(['active-key']);
    expect(cache.size()).toBe(1); // expired entry should be deleted
  });
}); 