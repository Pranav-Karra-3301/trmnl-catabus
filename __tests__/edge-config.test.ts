import { upsert } from '@/lib/edge-config';

// Mock global fetch
const fetchMock = jest.fn();

// Replace global fetch with mock
(global as any).fetch = fetchMock;

const API_REGEX = /https:\/\/api\.vercel\.com\/v1\/edge-config\/.+\/items/;

describe('edge-config upsert helper', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('sends correct PATCH body shape', async () => {
    process.env.EDGE_CONFIG = 'dummy_store';
    process.env.VERCEL_TOKEN = 'dummy_token';
    fetchMock.mockResolvedValueOnce({ ok: true });

    const items = [
      { key: 'stop:123', value: { foo: 'bar' } },
      { key: 'stop:456', value: { baz: 42 } },
    ];

    await upsert(items);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(API_REGEX);
    expect(opts.method).toBe('PATCH');

    const body = JSON.parse(opts.body as string);
    expect(body).toEqual(
      items.map(({ key, value }) => ({ operation: 'upsert', key, value }))
    );
  });
}); 