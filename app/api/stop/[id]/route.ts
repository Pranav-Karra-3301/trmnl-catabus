import { get } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stopId } = await params;
  console.log('[stop-api] requested id:', stopId);

  if (!stopId) {
    return new Response(
      JSON.stringify({ error: 'missing-stop-id' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        },
      }
    );
  }

  const raw = await get(`stop:${stopId}`);
  if (raw === undefined) {
    return new Response(
      JSON.stringify({ error: 'no-data' }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        },
      }
    );
  }

  const obj = JSON.parse(raw as string);
  console.log('[stop-api] returning payload bytes:', raw.length);
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
    },
  });
}
