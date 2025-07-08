import { get } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stopId } = await params;
  console.log(`[stop] Fetching data for stop ${stopId}`);
  
  try {
    const json = await get(`stop:${stopId}`);
    console.log(`[stop] Got data for stop ${stopId}:`, json ? 'found' : 'not found');

    if (json === undefined) {
      return new Response(JSON.stringify({ error: 'no-data' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        },
      });
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error(`[stop] Error fetching stop ${stopId}:`, error);
    return new Response(JSON.stringify({ 
      error: 'internal-error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
