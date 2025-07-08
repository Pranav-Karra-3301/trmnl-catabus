import { get, getAll } from '@vercel/edge-config';

export async function upsert(items: { key: string; value: unknown }[]) {
  // Check if we have the required environment variables for writing
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_TOKEN;
  
  console.log('Upsert called with', items.length, 'items');
  console.log('EDGE_CONFIG_ID:', edgeConfigId ? 'set' : 'not set');
  console.log('VERCEL_TOKEN:', token ? 'set' : 'not set');
  
  if (!edgeConfigId) {
    console.warn('EDGE_CONFIG_ID not set, skipping upsert');
    return;
  }
  
  if (!token) {
    console.warn('VERCEL_TOKEN not set, skipping upsert');
    return;
  }

  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        items.map((i) => ({
          operation: 'upsert',
          key: i.key,
          value: i.value,
        }))
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update Edge Config: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to update Edge Config: ${response.status} ${response.statusText}`);
    }
    
    console.log('Successfully updated Edge Config');
  } catch (error) {
    console.error('Error updating Edge Config:', error);
    throw error;
  }
}

export { get, getAll };