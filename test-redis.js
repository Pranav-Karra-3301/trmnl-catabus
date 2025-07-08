const Redis = require('ioredis');

async function testRedis() {
  console.log('Testing Redis connection...');
  console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
  
  if (!process.env.REDIS_URL) {
    console.log('REDIS_URL environment variable is not set');
    return;
  }

  try {
    const redis = new Redis(process.env.REDIS_URL);
    console.log('Redis client created');
    
    const result = await redis.ping();
    console.log('Ping result:', result);
    
    const keys = await redis.keys('stop:*');
    console.log('Keys found:', keys.length);
    console.log('First 10 keys:', keys.slice(0, 10));
    
    if (keys.length > 0) {
      const firstKey = keys[0];
      const data = await redis.get(firstKey);
      console.log('Sample data for', firstKey, ':', data ? 'found' : 'not found');
    }
    
    redis.disconnect();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Redis test error:', error);
  }
}

testRedis();
