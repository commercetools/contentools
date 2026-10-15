import { createStore, route } from '../support/fake-ct-store';

const noQuery = new URLSearchParams();
const put = (s: ReturnType<typeof createStore>, container: string, key: string, value: unknown, version?: number) =>
  route(s, 'POST', '/test-project/custom-objects', noQuery, { container, key, value, ...(version !== undefined ? { version } : {}) });

describe('fake commercetools store', () => {
  it('upserts: v1 on create (201), v2 on update (200)', () => {
    const s = createStore();
    const a = put(s, 'c', 'k', { n: 1 });
    expect(a.status).toBe(201);
    expect((a.body as { version: number }).version).toBe(1);
    const b = put(s, 'c', 'k', { n: 2 });
    expect(b.status).toBe(200);
    expect((b.body as { version: number; value: unknown }).version).toBe(2);
    expect((b.body as { value: unknown }).value).toEqual({ n: 2 });
  });

  it('answers 409 ConcurrentModification on a stale version', () => {
    const s = createStore();
    put(s, 'c', 'k', {});
    put(s, 'c', 'k', {}); // now v2
    const r = put(s, 'c', 'k', {}, 1);
    expect(r.status).toBe(409);
    expect((r.body as { errors: Array<{ code: string; currentVersion: number }> }).errors[0]).toMatchObject({ code: 'ConcurrentModification', currentVersion: 2 });
  });

  it('answers 404 with a commercetools-shaped body', () => {
    const r = route(createStore(), 'GET', '/test-project/custom-objects/c/missing', noQuery, undefined);
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({
      statusCode: 404,
      message: "The CustomObject with ID 'c|missing' was not found.",
      errors: [{ code: 'ResourceNotFound' }],
    });
  });

  it('lists with where: key in (...)', () => {
    const s = createStore();
    ['a', 'b', 'c'].forEach((k) => put(s, 'cont', k, {}));
    const r = route(s, 'GET', '/test-project/custom-objects/cont', new URLSearchParams({ where: 'key in ("a", "b")' }), undefined);
    expect(r.status).toBe(200);
    const body = r.body as { total: number; results: Array<{ key: string }> };
    expect(body.total).toBe(2);
    expect(body.results.map((o) => o.key).sort()).toEqual(['a', 'b']);
  });

  it('lists with where: value(f1 = "v1" AND f2 = "v2")', () => {
    const s = createStore();
    put(s, 'cont', 'one', { businessUnitKey: 'test-bu', contentType: 'x' });
    put(s, 'cont', 'two', { businessUnitKey: 'test-bu', contentType: 'y' });
    put(s, 'cont', 'three', { businessUnitKey: 'other', contentType: 'x' });
    const where = 'value(businessUnitKey = "test-bu" AND contentType = "x")';
    const r = route(s, 'GET', '/test-project/custom-objects/cont', new URLSearchParams({ where }), undefined);
    expect((r.body as { results: Array<{ key: string }> }).results.map((o) => o.key)).toEqual(['one']);
  });

  it('rejects an unsupported where clause with 400', () => {
    const r = route(createStore(), 'GET', '/test-project/custom-objects/cont', new URLSearchParams({ where: 'foo' }), undefined);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('fake-ct: unsupported where clause: foo');
  });
});

describe('fake product search', () => {
  it('answers the programmed result and records the call', async () => {
    const { getApiRoot } = await import('../../src/ct/client');
    const fake = await import('../support/fake-ct');
    fake.productSearch.respondWith(() => [{ id: 'p1' }]);
    const res = await getApiRoot()
      .products()
      .search()
      .post({ body: { query: { exact: { field: 'variants.sku', value: 'S' } } } })
      .execute();
    expect(res.body.results[0]?.id).toBe('p1');
    expect(fake.productSearch.calls).toHaveLength(1);
  });
});
