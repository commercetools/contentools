/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
const saved = process.env.PUBLIC_DATASOURCE_RESOLVE;
beforeEach(() => {
  delete process.env.PUBLIC_DATASOURCE_RESOLVE;
  t = setupApiTest();
});
afterAll(() => {
  if (saved !== undefined) process.env.PUBLIC_DATASOURCE_RESOLVE = saved;
});

const search = (query: string) => t.http.get(`/service/products/search${query}`).set(t.auth);

describe('GET /products/search', () => {
  it('returns the slim shape', async () => {
    t.fake.productSearch.respondWith(() => [
      {
        id: 'p1',
        productProjection: {
          id: 'p1',
          name: { 'en-US': 'Shoe' },
          slug: { 'en-US': 'shoe' },
          masterVariant: { id: 1, sku: 'S1', images: [{ url: 'https://img/1.png' }] },
        },
      },
    ]);
    const res = await search('?text=shoe');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'p1', name: 'Shoe', sku: 'S1', image: 'https://img/1.png', slug: 'shoe' },
    ]);
  });

  it('answers [] for empty text without searching', async () => {
    expect((await search('')).body).toEqual([]);
    expect(t.fake.productSearch.calls).toHaveLength(0);
  });

  it('accepts q as an alias', async () => {
    await search('?q=abc');
    expect(t.fake.productSearch.calls).toHaveLength(1);
  });

  it('caps the limit at 50 and defaults to 20', async () => {
    await search('?text=a&limit=500');
    await search('?text=a');
    const limits = t.fake.productSearch.calls.map((c) => (c as { limit: number }).limit);
    expect(limits).toEqual([50, 20]);
  });

  it('uses en-US as the default language of the localized clauses', async () => {
    await search('?text=a');
    const body = t.fake.productSearch.calls[0] as {
      query: { or: Array<{ wildcard: { field: string; language?: string } }> };
    };
    const localized = body.query.or.filter((c) => c.wildcard.language);
    expect(localized.map((c) => c.wildcard.language)).toEqual(['en-US', 'en-US']);
    await search('?text=a&locale=de-DE');
    const second = t.fake.productSearch.calls[1] as typeof body;
    expect(second.query.or[0]?.wildcard.language).toBe('de-DE');
  });

  it('maps a search API 400 to 502', async () => {
    t.fake.productSearch.failWith(400);
    const res = await search('?text=a');
    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Product search is not available for this project');
  });

  it('requires a credential, even with public resolve on', async () => {
    process.env.PUBLIC_DATASOURCE_RESOLVE = 'true';
    t = setupApiTest();
    expect((await t.http.get('/service/products/search?text=a')).status).toBe(401);
  });
});
