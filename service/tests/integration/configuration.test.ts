import { SLICES } from '../../src/config/slices';
import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
beforeEach(() => {
  t = setupApiTest();
});

const sample = (shape: string): unknown =>
  shape === 'array' ? [{ label: 'Orders', url: '/orders' }] : { color: 'red' };
const url = (bu: string, path: string) => `/service/${bu}/configuration/${path}`;
const seed = (key: string, value: unknown) => t.fake.seed('configuration', key, value);

describe.each(SLICES)('slice $path', (slice) => {
  it('round-trips through PUT and an anonymous GET', async () => {
    const value = sample(slice.shape);
    const put = await t.http.put(url('default', slice.path)).set(t.auth).send({ value });
    expect(put.status).toBe(200);
    const get = await t.http.get(url('default', slice.path));
    expect(get.status).toBe(200);
    expect(get.body).toEqual(value);
  });

  it('POST answers 201', async () => {
    const res = await t.http
      .post(url('default', slice.path))
      .set(t.auth)
      .send({ value: sample(slice.shape) });
    expect(res.status).toBe(201);
  });

  it('answers 200 null when missing', async () => {
    const res = await t.http.get(url('default', slice.path));
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('deletes idempotently', async () => {
    expect((await t.http.delete(url('default', slice.path)).set(t.auth)).status).toBe(204);
    expect((await t.http.delete(url('default', slice.path)).set(t.auth)).status).toBe(204);
  });

  it('rejects a missing value and a wrong shape', async () => {
    const missing = await t.http.put(url('default', slice.path)).set(t.auth).send({});
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('value is required in request body');
    const wrong = await t.http
      .put(url('default', slice.path))
      .set(t.auth)
      .send({ value: slice.shape === 'array' ? { a: 1 } : [1] });
    expect(wrong.status).toBe(400);
  });
});

describe('writes are protected', () => {
  it.each(['post', 'put', 'delete'] as const)('anonymous %s is 401', async (method) => {
    const res = await t.http[method](url('default', 'theme')).send({ value: {} });
    expect(res.status).toBe(401);
  });
});

describe('business unit fallback', () => {
  it('serves the default business unit value when the unit has none', async () => {
    seed('default-theme', { from: 'default' });
    const res = await t.http.get(url('b2b-eu', 'theme'));
    expect(res.body).toEqual({ from: 'default' });
  });

  it('prefers the unit own value', async () => {
    seed('default-theme', { from: 'default' });
    seed('b2b-eu-theme', { from: 'own' });
    expect((await t.http.get(url('b2b-eu', 'theme'))).body).toEqual({ from: 'own' });
  });
});

describe('aggregate', () => {
  it('returns nine keys: stored values and nulls, from one list request', async () => {
    seed('default-theme', { a: 1 });
    seed('default-footer', { b: 2 });
    t.fake.requests.length = 0;
    const res = await t.http.get('/service/default/configuration');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toHaveLength(9);
    expect(res.body.theme).toEqual({ a: 1 });
    expect(res.body.footer).toEqual({ b: 2 });
    expect(Object.values(res.body).filter((v) => v === null)).toHaveLength(7);
    const lists = t.fake.requests.filter((r) => r.method === 'GET' && r.url.includes('/custom-objects/'));
    expect(lists).toHaveLength(1);
    expect((await t.http.get('/service/default/configurations')).body).toEqual(res.body);
  });

  it('merges the unit values over the defaults and reads the base url string', async () => {
    seed('default-theme', { from: 'default' });
    seed('default-header', { from: 'default' });
    seed('b2b-eu-header', { from: 'own' });
    seed('default-contentools-base-url', 'https://example.test');
    const res = await t.http.get('/service/b2b-eu/configuration');
    expect(res.body.theme).toEqual({ from: 'default' });
    expect(res.body.header).toEqual({ from: 'own' });
    expect(res.body.contentoolsBaseUrl).toBe('https://example.test');
  });

  it('ignores a stored value of an unexpected type', async () => {
    seed('default-translations', 'not-an-object');
    expect((await t.http.get('/service/default/configuration')).body.translations).toBeNull();
  });
});
