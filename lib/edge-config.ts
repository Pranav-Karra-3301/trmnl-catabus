import { get, getAll } from '@vercel/edge-config';

const TOKEN = process.env.VERCEL_TOKEN!;
const STORE_ID = process.env.EDGE_CONFIG!;
const API = `https://api.vercel.com/v1/edge-config/${STORE_ID}/items`;

export async function writeItems(items: { key: string; value: any }[]) {
  await fetch(`${API}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      items.map((i) => ({
        operation: 'upsert',
        key: i.key,
        value: JSON.stringify(i.value),
      }))
    ),
  });
}

export { get, getAll }; 