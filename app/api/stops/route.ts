import { getAll } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    const all = await getAll();
    const stops = Object.keys(all)
      .filter((k) => k.startsWith('stop:'))
      .map((k) => k.split(':')[1]);

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