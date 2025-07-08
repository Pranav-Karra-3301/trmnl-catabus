import kv from '@/lib/kv';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    // Check if Redis URL is configured
    if (!process.env.REDIS_URL) {
      return new Response(JSON.stringify({ 
        error: 'redis-not-configured',
        message: 'Redis URL not configured',
        stops: [] 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    console.log('[stops] Fetching stop keys from Redis');
    const keys = await kv.keys('stop:*');
    console.log('[stops] Raw keys from Redis:', keys);
    
    if (!keys || !Array.isArray(keys)) {
      console.log('[stops] No keys found or keys is not an array');
      return new Response(JSON.stringify({ stops: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    const stops = keys.map((k: string) => k.split(':')[1]).filter(Boolean);
    console.log('[stops] Found', stops.length, 'stops:', stops.slice(0, 10));

    return new Response(JSON.stringify({ stops }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Stops API error:', error);

    return new Response(
      JSON.stringify({
        error: 'internal-error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stops: [],
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 