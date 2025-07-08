import { cache } from '@/lib/cache';

export const config = { runtime: 'edge' };

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const stopId = params.id;
  console.log('[stop-api] requested id:', stopId);

  if (!stopId) {
    return new Response(
      JSON.stringify({ error: 'missing-stop-id' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
        },
      }
    );
  }

  const json = cache.get(stopId);
  if (!json) {
    return new Response(
      JSON.stringify({ error: 'no-data' }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
        },
      }
    );
  }

  console.log('[stop-api] returning payload bytes:', json.length);
  return new Response(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
    },
  });
}
