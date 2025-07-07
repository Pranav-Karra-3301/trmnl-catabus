export const config = { runtime: 'edge' };
// TODO: lookup stopId from params, read from cache, return JSON
export async function GET(request: Request, { params }) {
  return new Response(null);
}
