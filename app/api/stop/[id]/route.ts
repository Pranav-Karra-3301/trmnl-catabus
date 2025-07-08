import { mapCache, edgeConfigCache } from '@/lib/cache';
import type { StopResponse, ErrorResponse } from '@/lib/types';

export const config = { runtime: 'edge' };

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stopId } = await params;
    
    if (!stopId) {
      const errorResponse: ErrorResponse = {
        error: 'missing-stop-id',
        message: 'Stop ID is required'
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
        }
      });
    }

    const stopKey = `stop:${stopId}`;
    
    // Try to get data from Map cache first, then Edge Config
    let departures = await mapCache.get(stopKey);
    
    if (!departures && edgeConfigCache.isAvailable()) {
      departures = await edgeConfigCache.get(stopKey);
    }
    
    if (!departures || departures.length === 0) {
      const errorResponse: ErrorResponse = {
        error: 'no-data',
        message: `No departure data available for stop ${stopId}`
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
        }
      });
    }

    const response: StopResponse = {
      updatedAt: Date.now(),
      departures
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
      }
    });

  } catch (error) {
    console.error('Stop API error:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'internal-error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=20'
      }
    });
  }
}
