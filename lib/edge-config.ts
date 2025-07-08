import { get, getAll } from '@vercel/edge-config';

const STORE = process.env.EDGE_CONFIG!;
const TOKEN = process.env.VERCEL_TOKEN!;
const API = `https://api.vercel.com/v1/edge-config/${STORE}/items`;

export async function upsert(items: { key: string; value: unknown }[]) {
  await fetch(API, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
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
}

export { get, getAll }; 