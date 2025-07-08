export async function GET() {
  return new Response(JSON.stringify({ 
    message: 'Test API working',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set'
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
