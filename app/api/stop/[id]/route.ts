import { get } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id: stopId } = params;
  const json = await get(`stop:${stopId}`);

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
}
