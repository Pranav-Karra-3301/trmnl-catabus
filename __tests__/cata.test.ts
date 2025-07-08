import { fetchFeed } from '@/lib/cata';
import type { Departure } from '@/lib/types';

// Mock fetch
global.fetch = jest.fn();

// Mock gtfs-realtime-bindings
jest.mock('gtfs-realtime-bindings', () => ({
  transit_realtime: {
    FeedMessage: {
      decode: jest.fn().mockReturnValue({
        entity: [
          {
            id: 'trip1',
            tripUpdate: {
              trip: {
                tripId: 'trip_123',
                routeId: 'ROUTE1'
              },
              vehicle: {
                id: 'vehicle_456'
              },
              stopTimeUpdate: [
                {
                  stopId: 'STOP1',
                  departure: {
                    time: { low: Math.floor((Date.now() + 300000) / 1000) }, // 5 minutes from now
                    delay: { low: 60 } // 1 minute delay
                  }
                }
              ]
            }
          }
        ]
      })
    }
  }
}));

// Skip tests if running in edge runtime
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';

describe('CATA Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const skipOnEdge = isEdgeRuntime ? it.skip : it;

  skipOnEdge('should parse GTFS-RT feed correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      // dummy text for xml fallback (unused)
      text: () => Promise.resolve('<xml></xml>'),
    });

    process.env.CATA_RT_URL = 'https://example.com/gtfs-rt';

    const map = await fetchFeed();

    expect(map.get('STOP1')).toBeDefined();
    const departures = map.get('STOP1') as Departure[];
    expect(departures).toHaveLength(1);
    expect(departures[0]).toMatchObject({ route: 'ROUTE1' });
  });

  skipOnEdge('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

    process.env.CATA_RT_URL = 'https://example.com/gtfs-rt';

    await expect(fetchFeed()).rejects.toThrow();
  });

  skipOnEdge('should throw error when URL is missing', async () => {
    delete process.env.CATA_RT_URL;
    await expect(fetchFeed()).rejects.toThrow('CATA_RT_URL environment variable is not set');
  });
}); 