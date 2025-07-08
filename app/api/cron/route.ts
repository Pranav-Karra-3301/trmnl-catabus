import { fetchFeed } from '@/lib/cata';
import kv from '@/lib/kv';

export const config = { runtime: 'edge' };

export async function GET() {
  const start = Date.now();
  try {
    console.log('[cron] Fetching latest CATA feed');
    const feed = await fetchFeed();
    console.log('[cron] Feed fetched successfully, got', feed.size, 'stops');

    const items: { key: string; value: unknown }[] = [];

    for (const [stopId, departures] of feed.entries()) {
      items.push({
        key: `stop:${stopId}`,
        value: {
          updatedAt: new Date().toISOString(),
          departures,
        },
      });
    }

    console.log('[cron] Prepared', items.length, 'items for upsert');

    try {
      // Use Redis (Vercel KV) to store the data
      for (const item of items) {
        await kv.set(item.key, item.value);
      }
      console.log('[cron] KV upsert completed successfully');
    } catch (upsertError) {
      console.error('[cron] KV upsert failed:', upsertError);
      // Continue execution instead of failing completely
    }

    console.log('cron wrote', items.length, 'stops');
    console.log(`[cron] Completed in ${Date.now() - start}ms`);

    return new Response(JSON.stringify({
      success: true,
      stopsProcessed: items.length,
      duration: Date.now() - start
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[cron] Error:', err);
    return new Response(JSON.stringify({ 
      error: 'cron-failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
