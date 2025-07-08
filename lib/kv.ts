import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('Redis Client Error:', err));

// Connect to Redis
if (!client.isOpen) {
  client.connect();
}

// Create a KV-compatible interface
const kv = {
  async get(key: string) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Redis get error:', error);
      return undefined;
    }
  },

  async set(key: string, value: unknown) {
    try {
      await client.set(key, JSON.stringify(value));
      return 'OK';
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  },

  async keys(pattern: string) {
    try {
      return await client.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  },
};

export default kv; 