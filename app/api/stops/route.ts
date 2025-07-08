import { getAll } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    console.log('[stops] Fetching all data from Edge Config');
    const all = await getAll();
    console.log('[stops] Got data from Edge Config:', all ? Object.keys(all).length : 0, 'keys');
    
    if (!all) {
      console.log('[stops] No data returned from Edge Config');
      return new Response(JSON.stringify({ stops: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const stops = Object.keys(all)
      .filter((k) => k.startsWith('stop:'))
      .map((k) => k.split(':')[1]);

    console.log('[stops] Filtered stops:', stops.length);

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