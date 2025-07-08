import { fetchAndParse } from '@/lib/cata';
import { mapCache } from '@/lib/cache';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    const cataRtBase = process.env.CATA_RT_BASE;
    const cataRtType = process.env.CATA_RT_TYPE;
    
    if (!cataRtBase || !cataRtType) {
      console.error('CATA_RT_BASE and CATA_RT_TYPE environment variables must be set');
      return new Response('CATA_RT_BASE and CATA_RT_TYPE not configured', { status: 500 });
    }
    
    const cataRtUrl = `${cataRtBase}?Type=${cataRtType}`;

    console.log('Starting GTFS-RT feed fetch and parse...');
    const startTime = Date.now();

    // Fetch and parse the GTFS-RT feed
    const departuresByStop = await fetchAndParse(cataRtUrl);
    
    const parseTime = Date.now() - startTime;
    console.log(`Feed parsing completed in ${parseTime}ms`);

    // Cache the data only in Map
    const cachePromises: Promise<void>[] = [];
    let cachedStops = 0;

    for (const [stopId, departures] of Object.entries(departuresByStop)) {
      if (departures.length > 0) {
        const stopKey = `stop:${stopId}`;
        
        // Cache in Map only
        cachePromises.push(mapCache.set(stopKey, departures));
        cachedStops++;
      }
    }

    // Wait for all cache operations to complete
    await Promise.all(cachePromises);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`Successfully cached departures for ${cachedStops} stops in ${totalTime}ms`);
    console.log(`Map cache size: ${mapCache.size()}`);

    return new Response(null, { 
      status: 204,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'cron-failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}
