import { fetchFeed } from '@/lib/cata';
import { cache } from '@/lib/cache';

export const config = { runtime: 'edge' };

export async function GET() {
  const start = Date.now();
  try {
    console.log('[cron] Fetching latest CATA feed');
    const feed = await fetchFeed();

    for (const [stopId, departures] of feed.entries()) {
      const payload = JSON.stringify({
        updatedAt: new Date().toISOString(),
        departures,
      });
      cache.set(stopId, payload);
    }

    console.log('[cron] Stops cached:', cache.getAllStopIds().slice(0, 20));
    console.log(`[cron] Completed in ${Date.now() - start}ms – total stops: ${cache.size()}`);

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[cron] Error:', err);
    return new Response(
      JSON.stringify({ error: 'cron-failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
