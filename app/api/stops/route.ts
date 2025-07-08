import { mapCache } from '@/lib/cache';

export const config = { runtime: 'edge' };

export async function GET() {
  try {
    const allKeys = mapCache.getAllKeys();
    
    // Extract stop IDs from keys (remove "stop:" prefix)
    const stopIds = allKeys
      .filter(key => key.startsWith('stop:'))
      .map(key => key.replace('stop:', ''))
      .sort();

    return new Response(JSON.stringify(stopIds), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
      }
    });

  } catch (error) {
    console.error('Stops API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'internal-error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
        }
      }
    );
  }
} 