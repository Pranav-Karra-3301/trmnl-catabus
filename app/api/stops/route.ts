import kv from '@/lib/kv';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    console.log('[stops] Fetching stop keys from KV');
    const keys = await kv.keys('stop:*');
    const stops = keys.map((k: string) => k.split(':')[1]);
    console.log('[stops] Found', stops.length, 'stops');

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