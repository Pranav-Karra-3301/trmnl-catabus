import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import type { Departure } from './types';

function toLong(value: number | { low: number } | undefined | null): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return value.low || 0;
}

export async function fetchAndParse(url: string): Promise<Record<string, Departure[]>> {
  if (!url) {
    throw new Error('CATA_RT_URL is not configured');
  }

  console.log('Fetching GTFS-RT feed from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch GTFS-RT feed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );

  console.log(`Parsed ${feed.entity.length} entities from feed`);

  const departuresByStop: Record<string, Departure[]> = {};
  const now = Date.now();

  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue;

    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;
    const vehicle = tripUpdate.vehicle;

    if (!trip?.routeId || !trip.tripId) continue;

    for (const stopTimeUpdate of tripUpdate.stopTimeUpdate || []) {
      if (!stopTimeUpdate.stopId) continue;

      const departure = stopTimeUpdate.departure;
      if (!departure) continue;

      const scheduledTime = toLong(departure.time) * 1000;
      const delay = toLong(departure.delay);
      const predictedTime = scheduledTime + (delay * 1000);

      // Skip departures that are in the past (more than 1 minute ago)
      if (predictedTime < now - 60000) continue;

      // Skip departures more than 2 hours in the future
      if (predictedTime > now + 2 * 60 * 60 * 1000) continue;

      const departureData: Departure = {
        routeId: trip.routeId,
        routeShortName: trip.routeId, // CATA uses route ID as short name
        tripId: trip.tripId,
        stopId: stopTimeUpdate.stopId,
        scheduledTime,
        predictedTime,
        delay,
        vehicleId: vehicle?.id || undefined
      };

      if (!departuresByStop[stopTimeUpdate.stopId]) {
        departuresByStop[stopTimeUpdate.stopId] = [];
      }

      departuresByStop[stopTimeUpdate.stopId].push(departureData);
    }
  }

  // Sort departures by predicted time and limit to 10 per stop
  for (const stopId in departuresByStop) {
    departuresByStop[stopId] = departuresByStop[stopId]
      .sort((a, b) => a.predictedTime - b.predictedTime)
      .slice(0, 10);
  }

  console.log(`Processed departures for ${Object.keys(departuresByStop).length} stops`);
  
  return departuresByStop;
}

export function formatDepartures(departures: Departure[]): Departure[] {
  return departures
    .sort((a, b) => a.predictedTime - b.predictedTime)
    .slice(0, 10);
}
