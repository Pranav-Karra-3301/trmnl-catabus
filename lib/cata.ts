import { XMLParser } from 'fast-xml-parser';
// The protobuf decoder is still the preferred format – the library is ESM-only
// and compatible with the edge runtime.
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import type { Departure } from './types';

/** Infer a number from either an int64 wrapper or plain number */
function toNumber(value: number | { low: number } | undefined | null): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return (value.low ?? 0) as number;
}

/**
 * Parse a GTFS-Realtime `FeedMessage` into the departure shape we expose.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProtobufFeed(feed: any): Map<string, Departure[]> {
  const byStop = new Map<string, Departure[]>();
  const now = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const entity of (feed.entity as any[])) {
    if (!entity.tripUpdate) continue;
    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;

    const route = trip?.routeId ?? '??';
    const headsign = trip?.tripId ?? 'Unknown';

    for (const stu of tripUpdate.stopTimeUpdate ?? []) {
      const stopId = stu.stopId;
      if (!stopId) continue;

      const departureMsg = stu.departure ?? null;
      if (!departureMsg) continue;

      const scheduled = toNumber(departureMsg.time) * 1000;
      const delaySeconds = toNumber(departureMsg.delay);
      const predicted = scheduled + delaySeconds * 1000;

      // Skip departures in the past (over 1 min ago) or >2h future
      if (predicted < now - 60_000) continue;
      if (predicted > now + 2 * 60 * 60 * 1000) continue;

      const status = delaySeconds > 90 ? 'delayed' : delaySeconds < -90 ? 'early' : 'on-time';

      const dep: Departure = {
        route,
        headsign,
        time: new Date(predicted).toISOString(),
        status,
      };

      const list = byStop.get(stopId) ?? [];
      list.push(dep);
      byStop.set(stopId, list);
    }
  }

  // Sort each stop's departures by soonest and cap at 10
  for (const [stopId, list] of byStop.entries()) {
    list.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    byStop.set(stopId, list.slice(0, 10));
  }

  return byStop;
}

/** Very naive XML parser for the CATA fallback feed. */
function parseXmlFeed(xml: string): Map<string, Departure[]> {
  const byStop = new Map<string, Departure[]>();
  const parser = new XMLParser({ ignoreAttributes: false });
  const json = parser.parse(xml);

  // CATA's XML structure isn’t publicly documented; we do a best-effort scan
  // for objects that look like GTFS-RT stop updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any[] = json?.TripUpdates?.TripUpdate ?? [];
  const now = Date.now();

  for (const upd of updates) {
    const route = upd?.Route ?? '??';
    const headsign = upd?.Headsign ?? 'Unknown';
    const calls = upd?.StopTimeUpdate ?? [];

    for (const call of Array.isArray(calls) ? calls : [calls]) {
      const stopId = call?.StopId;
      const departureEpoch = Number(call?.DepartureTime) * 1000;
      if (!stopId || !departureEpoch) continue;

      // Past/future filtering (same as protobuf)
      if (departureEpoch < now - 60_000) continue;
      if (departureEpoch > now + 2 * 60 * 60 * 1000) continue;

      const status = 'scheduled';
      const dep: Departure = {
        route,
        headsign,
        time: new Date(departureEpoch).toISOString(),
        status,
      };

      const list = byStop.get(stopId) ?? [];
      list.push(dep);
      byStop.set(stopId, list);
    }
  }

  // Sort & cap
  for (const [stopId, list] of byStop.entries()) {
    list.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    byStop.set(stopId, list.slice(0, 10));
  }

  return byStop;
}

/**
 * Fetch CATA's real-time feed, attempting protobuf first with an XML fallback.
 * Returns a map keyed by `stopId`.
 */
export async function fetchFeed(): Promise<Map<string, Departure[]>> {
  const url = process.env.CATA_RT_URL;
  if (!url) {
    throw new Error('CATA_RT_URL environment variable is not set');
  }

  // ----- 1. Protobuf attempt -------------------------------------------------
  try {
    const protoRes = await fetch(url, {
      headers: { Accept: 'application/x-protobuf' },
      // 10-second timeout via AbortController for safety
    });

    if (!protoRes.ok) {
      throw new Error(`proto fetch failed: ${protoRes.status}`);
    }

    const buffer = await protoRes.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    return parseProtobufFeed(feed);
  } catch {
    console.warn('[fetchFeed] Protobuf parsing failed – attempting XML fallback');
  }

  // ----- 2. XML attempt ------------------------------------------------------
  try {
    const xmlUrl = url.includes('?') ? `${url}&format=xml` : `${url}?format=xml`;
    const xmlRes = await fetch(xmlUrl);
    if (!xmlRes.ok) {
      throw new Error(`xml fetch failed: ${xmlRes.status}`);
    }
    const xmlText = await xmlRes.text();
    return parseXmlFeed(xmlText);
  } catch {
    console.error('[fetchFeed] XML parsing also failed');
    throw new Error('Failed to fetch and parse CATA real-time feed');
  }
}
