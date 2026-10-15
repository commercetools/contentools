import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
beforeEach(() => {
  t = setupApiTest();
});

const base = '/service/default/puck-pages';
const objects = (container: string) =>
  [...t.fake.store.objects.values()].filter((o) => o.container === container);

const create = async (
  body: Record<string, unknown> = { name: 'Home', slug: '/home' },
  bu = 'default'
) => {
  const res = await t.http
    .post(`/service/${bu}/puck-pages`)
    .set(t.auth)
    .send({ value: body });
  expect(res.status).toBe(201);
  return res.body.key as string;
};
const publish = (key: string, query = '') =>
  t.http.put(`${base}/${key}/states/published${query}`).set(t.auth).send();

describe('list and create', () => {
  it('lists 45 pages with their states and one state query', async () => {
    const keys: string[] = [];
    for (let i = 0; i < 45; i += 1) {
      keys.push(await create({ name: `P${i}`, slug: `/p${i}` }));
    }
    for (const k of keys.slice(0, 3)) await publish(k);
    t.fake.requests.length = 0;
    const res = await t.http.get(base).set(t.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(45);
    expect(
      res.body.filter((p: { states: { published?: unknown } }) => p.states.published)
    ).toHaveLength(3);
    const where = t.fake.requests.map((r) => decodeURIComponent(r.url)).filter((u) => u.includes('where='));
    expect(where.every((u) => !/\sOR\s/.test(u))).toBe(true);
  });

  it('creates with defaults, a draft state and one version', async () => {
    const res = await t.http
      .post(base)
      .set(t.auth)
      .send({ value: { name: 'Home', slug: '/home' } });
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^puck-page-/);
    expect(res.body.value.businessUnitKey).toBe('default');
    expect(res.body.value.puckData).toEqual({ content: [], root: { props: {} } });
    expect(objects('puck-page-state')).toHaveLength(1);
    expect(objects('puck-page-version')).toHaveLength(1);
  });

  it.each([
    [{}, 'value is required in request body'],
    [{ value: 'x' }, 'value is required in request body'],
    [{ value: [] }, 'value is required in request body'],
    [{ value: { slug: '/a' } }, 'name is required'],
    [{ value: { name: 'A' } }, 'slug is required'],
  ])('rejects body %j', async (body, message) => {
    const res = await t.http.post(base).set(t.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('accepts a body of about 900 KB', async () => {
    const res = await t.http
      .post(base)
      .set(t.auth)
      .send({
        value: {
          name: 'Big',
          slug: '/big',
          puckData: {
            content: [{ type: 'Text', props: { id: '1', text: 'x'.repeat(900_000) } }],
            root: { props: {} },
          },
        },
      });
    expect(res.status).toBe(201);
  });
});

describe('get, update, delete', () => {
  it('gets with states; unknown key and other business unit are 404', async () => {
    const key = await create();
    const ok = await t.http.get(`${base}/${key}`).set(t.auth);
    expect(ok.status).toBe(200);
    expect(ok.body.states.draft.name).toBe('Home');
    expect((await t.http.get(`${base}/nope`).set(t.auth)).status).toBe(404);
    const other = await t.http.get(`/service/other/puck-pages/${key}`).set(t.auth);
    expect(other.status).toBe(404);
  });

  it('merges updates, ignores protected fields and refreshes updatedAt', async () => {
    const key = await create();
    const before = (await t.http.get(`${base}/${key}`).set(t.auth)).body.value;
    await new Promise((r) => setTimeout(r, 5));
    const res = await t.http
      .put(`${base}/${key}`)
      .set(t.auth)
      .send({ value: { name: 'Renamed', createdAt: '2000-01-01', key: 'evil', businessUnitKey: 'evil' } });
    expect(res.status).toBe(200);
    expect(res.body.value.name).toBe('Renamed');
    expect(res.body.value.slug).toBe('/home');
    expect(res.body.value.key).toBe(key);
    expect(res.body.value.businessUnitKey).toBe('default');
    expect(res.body.value.createdAt).toBe(before.createdAt);
    expect(res.body.value.updatedAt > before.updatedAt).toBe(true);
  });

  it('answers 404 for a missing page and 400 without value', async () => {
    expect(
      (await t.http.put(`${base}/nope`).set(t.auth).send({ value: { name: 'x' } })).status
    ).toBe(404);
    const key = await create();
    expect((await t.http.put(`${base}/${key}`).set(t.auth).send({})).status).toBe(400);
  });

  it('deletes the page, its state and versions; a second delete is 404', async () => {
    const key = await create();
    expect((await t.http.delete(`${base}/${key}`).set(t.auth)).status).toBe(204);
    expect(objects('puck-page')).toHaveLength(0);
    expect(objects('puck-page-state')).toHaveLength(0);
    expect(objects('puck-page-version')).toHaveLength(0);
    expect((await t.http.delete(`${base}/${key}`).set(t.auth)).status).toBe(404);
  });
});

describe('published reads (public)', () => {
  const pageWithDatasource = {
    name: 'Home',
    slug: '/home',
    puckData: {
      content: [
        { type: 'Hero', props: { id: '1', product: { type: 'product-by-sku', skus: ['S1'] } } },
      ],
      root: { props: {} },
    },
  };

  it('is 404 before publishing and 200 anonymously after', async () => {
    const key = await create();
    const url = `/service/default/published/puck-pages/${key}`;
    expect((await t.http.get(url)).status).toBe(404);
    expect((await publish(key)).status).toBe(200);
    expect((await t.http.get(url)).status).toBe(200);
  });

  it('resolves datasources on read and degrades to null when search fails', async () => {
    t.fake.productSearch.respondWith(() => [
      { id: 'p1', productProjection: { id: 'p1', masterVariant: { id: 1, sku: 'S1' } } },
    ]);
    const key = await create(pageWithDatasource);
    await publish(key);
    const url = `/service/default/published/puck-pages/${key}`;
    const ok = await t.http.get(url);
    expect(ok.body.puckData.content[0].props.product.resolvedData.id).toBe('p1');
    t.fake.productSearch.failWith(503);
    const failed = await t.http.get(url);
    expect(failed.status).toBe(200);
    expect(failed.body.puckData.content[0].props.product.resolvedData).toBeNull();
  }, 20_000);

  it('answers 404 with the documented message', async () => {
    const res = await t.http.get('/service/default/published/puck-pages/nope');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Published puck page not found');
  });

  it('queries by slug anonymously', async () => {
    const key = await create();
    await publish(key);
    const url = '/service/default/published/puck-pages/query';
    const ok = await t.http.post(url).send({ query: 'slug = "/home"' });
    expect(ok.status).toBe(200);
    expect(ok.body.key).toBe(key);
    const missing = await t.http.post(url).send({});
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('query is required in request body');
    for (const query of ['slug = "a" OR name = "b"', 'secret = "x"']) {
      const bad = await t.http.post(url).send({ query });
      expect(bad.status).toBe(400);
      expect(bad.body.message).toBe('Invalid query');
    }
    const none = await t.http.post(url).send({ query: 'slug = "/nope"' });
    expect(none.status).toBe(404);
    expect(none.body.message).toBe('Published puck page not found');
  });

  it('escapes an injection attempt instead of splicing it', async () => {
    await create();
    t.fake.requests.length = 0;
    const res = await t.http
      .post('/service/default/published/puck-pages/query')
      .send({ query: 'slug = "x\\" OR name = \\"y"' });
    expect(res.status).toBe(404);
    const wheres = t.fake.requests
      .map((r) => new URL(r.url).searchParams.get('where') ?? '')
      .filter(Boolean);
    expect(wheres).toContain('value(slug = "x\\" OR name = \\"y" AND businessUnitKey = "default")');
  });

  it('rejects a hostile key without touching commercetools', async () => {
    t.fake.requests.length = 0;
    const res = await t.http.get('/service/default/published/puck-pages/x%22%20OR%20key');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid key');
    expect(t.fake.requests.filter((r) => r.url.includes('custom-objects'))).toHaveLength(0);
  });
});

describe('preview reads (protected)', () => {
  it('requires a credential', async () => {
    const key = await create();
    expect((await t.http.get(`/service/default/preview/puck-pages/${key}`)).status).toBe(401);
    expect(
      (await t.http.post('/service/default/preview/puck-pages/query').send({ query: 'slug = "/home"' })).status
    ).toBe(401);
  });

  it('returns the draft when there is one, else the published value', async () => {
    const key = await create();
    await publish(key);
    await t.http.put(`${base}/${key}`).set(t.auth).send({ value: { name: 'Draft name' } });
    const url = `/service/default/preview/puck-pages/${key}`;
    expect((await t.http.get(url).set(t.auth)).body.name).toBe('Draft name');
    await publish(key, '?clearDraft=true');
    expect((await t.http.get(url).set(t.auth)).body.name).toBe('Draft name');
    const fresh = await t.http.get('/service/default/preview/puck-pages/nope').set(t.auth);
    expect(fresh.status).toBe(404);
    expect(fresh.body.message).toBe('Puck page not found');
  });

  it('queries preview: draft then published', async () => {
    const key = await create();
    await publish(key);
    await t.http.put(`${base}/${key}`).set(t.auth).send({ value: { name: 'Edited' } });
    const res = await t.http
      .post('/service/default/preview/puck-pages/query')
      .set(t.auth)
      .send({ query: 'slug = "/home"' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Edited');
  });
});
