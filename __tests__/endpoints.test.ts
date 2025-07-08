import { GET as cronGET } from '@/app/api/cron/route';
import { GET as stopsGET } from '@/app/api/stops/route';
import { GET as stopGET } from '@/app/api/stop/[id]/route';

const store = new Map<string, string>();

jest.mock('@/lib/edge-config', () => ({
  __esModule: true,
  writeItems: jest.fn(async (items: { key: string; value: any }[]) => {
    items.forEach(({ key, value }) => {
      store.set(key, JSON.stringify(value));
    });
  }),
  get: jest.fn(async (key: string) => store.get(key)),
  getAll: jest.fn(async () => {
    const obj: Record<string, string> = {};
    store.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }),
}));

jest.mock('@/lib/cata', () => ({
  fetchFeed: jest.fn().mockResolvedValue(
    new Map([
      [
        '72',
        [
          {
            route: 'ROUTE1',
            headsign: 'Downtown',
            time: new Date().toISOString(),
            status: 'on-time',
          },
        ],
      ],
      [
        '99',
        [
          {
            route: 'ROUTEX',
            headsign: 'Campus',
            time: new Date().toISOString(),
            status: 'on-time',
          },
        ],
      ],
    ])
  ),
}));

describe('API endpoints integration', () => {
  it('populates cache via cron and serves data', async () => {
    // 1. Run cron
    const cronRes = await cronGET();
    expect(cronRes.status).toBe(204);

    // 2. /api/stops should list ids
    const stopsRes = await stopsGET();
    const stopsJson = JSON.parse(await stopsRes.text());
    expect(stopsRes.status).toBe(200);
    expect(stopsJson.stops).toEqual(expect.arrayContaining(['72', '99']));

    // 3. valid stop id
    const stopValid = await stopGET({} as any, { params: Promise.resolve({ id: '72' }) });
    expect(stopValid.status).toBe(200);
    const payload = JSON.parse(await stopValid.text());
    expect(payload.departures).toHaveLength(1);

    // 4. invalid stop id
    const stopInvalid = await stopGET({} as any, { params: Promise.resolve({ id: '000' }) });
    expect(stopInvalid.status).toBe(503);
  });
}); 