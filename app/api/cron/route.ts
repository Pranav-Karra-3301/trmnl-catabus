import { fetchFeed } from '@/lib/cata';
import { writeItems } from '../../../lib/edge-config';

export const config = { runtime: 'edge' };

export async function GET() {
  const start = Date.now();
  try {
    console.log('[cron] Fetching latest CATA feed');
    const feed = await fetchFeed();

    const items: { key: string; value: any }[] = [];

    for (const [stopId, departures] of feed.entries()) {
      items.push({
        key: `stop:${stopId}`,
        value: {
          updatedAt: new Date().toISOString(),
          departures,
        },
      });
    }

    await writeItems(items);

    console.log('[cron] wrote stops to Edge Config:', items.length);
    console.log(`[cron] Completed in ${Date.now() - start}ms`);

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[cron] Error:', err);
    return new Response(JSON.stringify({ error: 'cron-failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
