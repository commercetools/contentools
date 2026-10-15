import { createPuckClient, PuckAuthError } from '@commercetools-labs/contentools-api';
import { describe, expect, it } from 'vitest';
import { loadPuckData } from './loadPuckData';
import { jsonResponse, recordingFetcher } from './test-fetcher';

const BASE = 'http://svc.test/service';
const data = { root: { props: {} }, content: [] };
const page = { key: 'home', puckData: data };

describe('loadPuckData', () => {
  it('reads a published page by key with one anonymous GET', async () => {
    const { fetcher, requests } = recordingFetcher(() => jsonResponse(200, page));
    const client = createPuckClient({ baseURL: BASE, businessUnitKey: 'main-store', fetcher });
    await expect(
      loadPuckData(client, { type: 'page', pageKey: 'home', mode: 'published' })
    ).resolves.toEqual(data);
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      `GET ${BASE}/main-store/published/puck-pages/home`,
    ]);
  });

  it('queries a published page by slug', async () => {
    const { fetcher, requests } = recordingFetcher(() => jsonResponse(200, page));
    const client = createPuckClient({ baseURL: BASE, businessUnitKey: 'main-store', fetcher });
    await loadPuckData(client, { type: 'page', slug: '/home', mode: 'published' });
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${BASE}/main-store/published/puck-pages/query`);
    expect(requests[0].body).toBe('{"query":"slug = \\"/home\\""}');
  });

  it('reads the preview by key and rejects without auth', async () => {
    const { fetcher, requests } = recordingFetcher(() => jsonResponse(200, page));
    const withToken = createPuckClient({
      baseURL: BASE,
      businessUnitKey: 'main-store',
      fetcher,
      jwtToken: 't',
    });
    await loadPuckData(withToken, { type: 'page', pageKey: 'home', mode: 'preview' });
    expect(requests[0].url).toBe(`${BASE}/main-store/preview/puck-pages/home`);

    const anonymous = createPuckClient({ baseURL: BASE, businessUnitKey: 'main-store' });
    await expect(
      loadPuckData(anonymous, { type: 'page', pageKey: 'home', mode: 'preview' })
    ).rejects.toBeInstanceOf(PuckAuthError);
  });

  it('loads content by key or content type and returns null when nothing is given', async () => {
    const { fetcher, requests } = recordingFetcher(() => jsonResponse(200, { data }));
    const client = createPuckClient({ baseURL: BASE, businessUnitKey: 'main-store', fetcher });
    await expect(
      loadPuckData(client, { type: 'content', contentKey: 'hero', mode: 'published' })
    ).resolves.toEqual(data);
    await loadPuckData(client, { type: 'content', query: 'hero', mode: 'published' });
    expect(requests[1].body).toBe('{"query":"contentType = \\"hero\\""}');
    await expect(loadPuckData(client, { type: 'page', mode: 'published' })).resolves.toBeNull();
  });

  it('resolves null when a query finds nothing', async () => {
    const { fetcher } = recordingFetcher(() => jsonResponse(404));
    const client = createPuckClient({ baseURL: BASE, businessUnitKey: 'main-store', fetcher });
    await expect(
      loadPuckData(client, { type: 'page', slug: '/missing', mode: 'published' })
    ).resolves.toBeNull();
  });
});
