import { resetConfigurationForTests } from '../../src/config/env';
import { resetApiRootForTests } from '../../src/ct/client';
import { customObjects } from '../../src/ct/custom-objects';
import { createItemStore } from '../../src/services/item-store';
import type { ItemValue } from '../../src/types/content';
import { resetLoggerForTests } from '../../src/utils/logger.utils';
import * as fake from '../support/fake-ct';

interface Thing extends ItemValue {
  slug: string;
  name: string;
}

const store = createItemStore<Thing, { slug: string; name: string }, { name?: string }>({
  keyPrefix: 'puck-page-',
  containers: { item: 'puckPage', state: 'puckPageState', version: 'puckPageVersion' },
  queryFields: ['slug', 'name', 'key'],
  build: (bu, key, input) => {
    const now = new Date().toISOString();
    return { key, businessUnitKey: bu, ...input, createdAt: now, updatedAt: now };
  },
  applyUpdate: (existing, input) => ({
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    updatedAt: new Date().toISOString(),
  }),
});

const BU = 'default';

const reset = (maxVersions?: string) => {
  if (maxVersions === undefined) delete process.env.MAX_VERSIONS;
  else process.env.MAX_VERSIONS = maxVersions;
  resetConfigurationForTests();
  resetApiRootForTests();
  resetLoggerForTests();
};

beforeEach(() => reset());
afterAll(() => {
  process.env.MAX_VERSIONS = '3';
});

const statusOf = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return (e as { statusCode?: unknown }).statusCode;
  }
  return undefined;
};

const countOf = (container: string) =>
  [...fake.store.objects.values()].filter((o) => o.container === container).length;

describe('item store', () => {
  it('create writes the item, a draft state and one version entry', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    expect(obj.key).toMatch(/^puck-page-/);
    expect(countOf('puck-page')).toBe(1);
    const st = await store.states(BU, obj.key);
    expect(st.states.draft?.name).toBe('A');
    expect((await store.versions(BU, obj.key)).versions).toHaveLength(1);
  });

  it('update merges, refreshes updatedAt and lists versions newest first', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    await store.update(BU, obj.key, { name: 'B' });
    const got = await store.getWithStates(BU, obj.key);
    expect(got.value.name).toBe('B');
    expect(got.value.slug).toBe('/a');
    expect(got.value.updatedAt > got.value.createdAt).toBe(true);
    const v = await store.versions(BU, obj.key);
    expect(v.versions.map((e) => e.name)).toEqual(['B', 'A']);
  });

  it.each([
    ['5', 6, 5],
    ['2', 4, 2],
    ['1', 3, 1],
  ])('prunes versions: MAX_VERSIONS=%s with %i updates keeps %i', async (max, updates, kept) => {
    reset(max);
    const obj = await store.create(BU, { slug: '/a', name: 'n0' });
    for (let i = 1; i <= updates; i += 1) {
      await store.update(BU, obj.key, { name: `n${i}` });
    }
    const v = (await store.versions(BU, obj.key)).versions;
    expect(v).toHaveLength(kept);
    expect(v[0]?.name).toBe(`n${updates}`);
    expect(v.some((e) => e.name === 'n0')).toBe(false);
  });

  it('publish keeps the draft; clearDraft removes it', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    const kept = await store.publish(BU, obj.key, false);
    expect(kept.states.published?.name).toBe('A');
    expect(kept.states.draft?.name).toBe('A');
    const cleared = await store.publish(BU, obj.key, true);
    expect(cleared.states.draft).toBeUndefined();
    expect(cleared.states.published?.name).toBe('A');
  });

  it('revertDraft needs a published state, then restores it', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    await expect(store.revertDraft(BU, obj.key)).rejects.toMatchObject({
      statusCode: 404,
      message: 'No published state found',
    });
    await store.publish(BU, obj.key, false);
    await store.update(BU, obj.key, { name: 'B' });
    const st = await store.revertDraft(BU, obj.key);
    expect(st.states.draft).toBeUndefined();
    expect((await store.getWithStates(BU, obj.key)).value.name).toBe('A');
  });

  it('isolates business units', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    expect(await statusOf(store.getWithStates('other', obj.key))).toBe(404);
    expect(await statusOf(store.remove('other', obj.key))).toBe(404);
    expect(await statusOf(store.update('other', obj.key, { name: 'x' }))).toBe(404);
    expect(countOf('puck-page')).toBe(1);
  });

  it('remove deletes item, state and versions; a second remove is 404', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    await store.remove(BU, obj.key);
    expect(countOf('puck-page')).toBe(0);
    expect(countOf('puck-page-state')).toBe(0);
    expect(countOf('puck-page-version')).toBe(0);
    expect(await statusOf(store.remove(BU, obj.key))).toBe(404);
  });

  it('lists 45 items with exactly one state query', async () => {
    for (let i = 0; i < 45; i += 1) {
      await store.create(BU, { slug: `/p${i}`, name: `P${i}` });
    }
    fake.requests.length = 0;
    const all = await store.list(BU);
    expect(all).toHaveLength(45);
    const stateLists = fake.requests.filter(
      (r) => r.method === 'GET' && r.url.includes('/custom-objects/puck-page-state')
    );
    expect(stateLists).toHaveLength(1);
    const where = new URL(stateLists[0]?.url ?? '').searchParams.get('where') ?? '';
    expect(where).toBe('value(businessUnitKey = "default")');
    expect(where).not.toMatch(/\bOR\b/);
  });

  it('survives a concurrent modification on the item write', async () => {
    const obj = await store.create(BU, { slug: '/a', name: 'A' });
    fake.requests.length = 0;
    fake.failNextWriteWith(409);
    await store.update(BU, obj.key, { name: 'B' });
    const posts = fake.requests.filter((r) => r.method === 'POST' && r.url.endsWith('/custom-objects'));
    const containers = posts.map((r) => (r.body as { container: string }).container);
    expect(containers.filter((c) => c === 'puck-page')).toHaveLength(2);
    expect(containers.filter((c) => c === 'puck-page-version')).toHaveLength(1);
    expect((await store.versions(BU, obj.key)).versions[0]?.name).toBe('B');
  });

  it('never splices client text into a predicate', async () => {
    await store.create(BU, { slug: '/a', name: 'A' });
    expect((await store.query(BU, 'slug = "/a"', 'preview'))?.slug).toBe('/a');
    fake.requests.length = 0;
    expect(await store.query(BU, 'slug = "x\\" OR name = \\"y"', 'published')).toBeUndefined();
    const where = fake.requests
      .map((r) => new URL(r.url).searchParams.get('where') ?? '')
      .find((w) => w.includes('OR'));
    expect(where).toBe('value(slug = "x\\" OR name = \\"y" AND businessUnitKey = "default")');
    await expect(store.query(BU, 'slug = "x" OR name = "y"', 'published')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('reads of unknown items are empty', async () => {
    expect((await store.states(BU, 'nope')).states).toEqual({});
    expect((await store.versions(BU, 'nope')).versions).toEqual([]);
    expect(await store.published(BU, 'nope')).toBeUndefined();
    expect(await customObjects('puckPage').get('nope')).toBeNull();
  });
});
