import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
const setup = (maxVersions?: string) => {
  if (maxVersions === undefined) delete process.env.MAX_VERSIONS;
  else process.env.MAX_VERSIONS = maxVersions;
  t = setupApiTest();
};
beforeEach(() => setup());
afterAll(() => {
  process.env.MAX_VERSIONS = '3';
});

const kinds = [
  ['pages', 'puck-pages', { name: 'n0', slug: '/a' }],
  ['contents', 'puck-contents', { name: 'n0', contentType: 'hero' }],
] as const;

describe.each(kinds)('states and versions of %s', (_label, path, seed) => {
  const base = `/service/default/${path}`;
  const create = async () =>
    (await t.http.post(base).set(t.auth).send({ value: seed })).body.key as string;
  const edit = (key: string, name: string) =>
    t.http.put(`${base}/${key}`).set(t.auth).send({ value: { name } });

  it('reports a fresh draft, and empty states for an unknown key', async () => {
    const key = await create();
    const fresh = await t.http.get(`${base}/${key}/states`).set(t.auth);
    expect(fresh.body.states.draft.name).toBe('n0');
    expect(fresh.body.states.published).toBeUndefined();
    const unknown = await t.http.get(`${base}/nope/states`).set(t.auth);
    expect(unknown.status).toBe(200);
    expect(unknown.body.states).toEqual({});
  });

  it('publish keeps the draft; clearDraft=true drops it', async () => {
    const key = await create();
    const kept = await t.http.put(`${base}/${key}/states/published`).set(t.auth).send();
    expect(kept.body.states.draft).toBeDefined();
    expect(kept.body.states.published.name).toBe('n0');
    const cleared = await t.http
      .put(`${base}/${key}/states/published?clearDraft=true`)
      .set(t.auth)
      .send();
    expect(cleared.body.states.draft).toBeUndefined();
  });

  it('reverting without a publication is 404', async () => {
    const key = await create();
    const res = await t.http.delete(`${base}/${key}/states/draft`).set(t.auth);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('No published state found');
  });

  it('reverting restores the published value and removes the draft', async () => {
    const key = await create();
    await t.http.put(`${base}/${key}/states/published`).set(t.auth).send();
    await edit(key, 'edited');
    const res = await t.http.delete(`${base}/${key}/states/draft`).set(t.auth);
    expect(res.status).toBe(200);
    expect(res.body.states.draft).toBeUndefined();
    const stored = await t.http.get(`${base}/${key}`).set(t.auth);
    expect(stored.body.value.name).toBe('n0');
  });

  it('lists versions newest first; unknown key has none', async () => {
    const key = await create();
    await edit(key, 'n1');
    await edit(key, 'n2');
    const res = await t.http.get(`${base}/${key}/versions`).set(t.auth);
    expect(res.body.versions.map((v: { name: string }) => v.name)).toEqual(['n2', 'n1', 'n0']);
    const none = await t.http.get(`${base}/nope/versions`).set(t.auth);
    expect(none.body.versions).toEqual([]);
  });

  it.each([
    [undefined, 6, 5],
    ['3', 3, 3],
  ])('prunes: MAX_VERSIONS=%s, %i updates keep %i', async (max, updates, kept) => {
    setup(max);
    const key = await create();
    for (let i = 1; i <= updates; i += 1) await edit(key, `n${i}`);
    const v = (await t.http.get(`${base}/${key}/versions`).set(t.auth)).body.versions;
    expect(v).toHaveLength(kept);
    expect(v[0].name).toBe(`n${updates}`);
    expect(v.some((e: { name: string }) => e.name === 'n0')).toBe(false);
  });

  it('keeps both entries of two parallel saves despite a conflict', async () => {
    const key = await create();
    t.fake.failNextWriteWith(409);
    const [a, b] = await Promise.all([edit(key, 'pa'), edit(key, 'pb')]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const names = (await t.http.get(`${base}/${key}/versions`).set(t.auth)).body.versions.map(
      (v: { name: string }) => v.name
    );
    expect(names).toEqual(expect.arrayContaining(['pa', 'pb', 'n0']));
  });
});
