import { fetchAndParse } from '@/lib/cata';

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
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    });

    const result = await fetchAndParse('https://example.com/gtfs-rt');

    expect(result).toBeDefined();
    expect(result['STOP1']).toBeDefined();
    expect(result['STOP1']).toHaveLength(1);
    expect(result['STOP1'][0]).toMatchObject({
      routeId: 'ROUTE1',
      tripId: 'trip_123',
      stopId: 'STOP1',
      vehicleId: 'vehicle_456'
    });
  });

  skipOnEdge('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(fetchAndParse('https://example.com/gtfs-rt')).rejects.toThrow(
      'Failed to fetch GTFS-RT feed: 500 Internal Server Error'
    );
  });

  skipOnEdge('should throw error when URL is missing', async () => {
    await expect(fetchAndParse('')).rejects.toThrow('CATA_RT_URL is not configured');
  });
}); 