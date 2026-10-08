/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { resetConfigurationForTests } from '../../src/config/env';
import { resetApiRootForTests } from '../../src/ct/client';
import { customObjects } from '../../src/ct/custom-objects';
import { toCustomError } from '../../src/ct/errors';
import CustomError from '../../src/errors/custom.error';
import { resetLoggerForTests } from '../../src/utils/logger.utils';
import { listenQuietly, startFakeCt } from '../support/fake-ct';

const fake = startFakeCt();

beforeAll(() => listenQuietly(fake.server));
beforeEach(() => {
  delete process.env.CONTAINER_PREFIX;
  resetConfigurationForTests();
  resetApiRootForTests();
  resetLoggerForTests();
});
afterEach(() => fake.reset());
afterAll(() => fake.server.close());

const statusOf = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return (e as CustomError).statusCode;
  }
  return undefined;
};

describe('customObjects', () => {
  it('get on a missing key resolves null', async () => {
    expect(await customObjects('puckPage').get('nope')).toBeNull();
  });

  it('getOrThrow on a missing key rejects 404', async () => {
    expect(await statusOf(customObjects('puckPage').getOrThrow('nope'))).toBe(
      404
    );
  });

  it('delete on a missing key resolves false', async () => {
    expect(await customObjects('puckPage').delete('nope')).toBe(false);
  });

  it('delete on an existing key resolves true', async () => {
    const co = customObjects('puckPage');
    await co.put('k', { a: 1 });
    expect(await co.delete('k')).toBe(true);
    expect(await co.get('k')).toBeNull();
  });

  it('put then get returns the value', async () => {
    const co = customObjects('configuration');
    await co.put('k', { a: 1 });
    expect((await co.get('k'))?.value).toEqual({ a: 1 });
  });

  it('create twice rejects 409 the second time', async () => {
    const co = customObjects('datasource');
    await co.create('k', { a: 1 });
    expect(await statusOf(co.create('k', { a: 2 }))).toBe(409);
  });

  it('list returns every object, paginating with limit 500', async () => {
    const container = customObjects('puckContent').container;
    for (let i = 0; i < 1203; i += 1) {
      fake.store.seed(container, `k${i}`, { i });
    }
    const all = await customObjects('puckContent').list();
    expect(all).toHaveLength(1203);
    const listCalls = fake.requests.filter(
      (r) => r.method === 'GET' && r.url.includes('limit=500')
    );
    expect(listCalls).toHaveLength(3);
  });

  it('list applies a where predicate', async () => {
    const co = customObjects('puckPage');
    await co.put('a', { bu: 'x' });
    await co.put('b', { bu: 'y' });
    const res = await co.list('value(bu = "x")');
    expect(res.map((o) => o.key)).toEqual(['a']);
  });

  it('update retries after a concurrent modification', async () => {
    const co = customObjects('puckPageState');
    await co.put('k', { n: 1 });
    fake.store.failNextWriteWith(409);
    const mutate = jest.fn((cur: { n: number } | null) => ({
      n: (cur?.n ?? 0) + 1,
    }));
    const res = await co.update('k', mutate);
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(res.value).toEqual({ n: 2 });
  });

  it('update gives up with 409 after the maximum attempts', async () => {
    const co = customObjects('puckPageState');
    const mutate = jest.fn(() => ({ n: 1 }));
    fake.store.failNextWriteWith(409);
    expect(await statusOf(co.update('k', mutate, 1))).toBe(409);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('applies the container prefix', async () => {
    process.env.CONTAINER_PREFIX = 'contentools-test-';
    resetConfigurationForTests();
    await customObjects('puckPage').put('k', {});
    expect(fake.store.objects.has('contentools-test-puck-page/k')).toBe(true);
  });

  it('reuses the OAuth token across calls', async () => {
    const co = customObjects('puckPage');
    await co.get('a');
    await co.get('b');
    const tokenCalls = fake.requests.filter((r) =>
      r.url.endsWith('/oauth/token')
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it('forwards the generated client scopes', async () => {
    await customObjects('puckPage').get('a');
    const tokenCall = fake.requests.find((r) => r.url.endsWith('/oauth/token'));
    expect((tokenCall?.body as { scope: string }).scope).toBe(
      'manage_key_value_documents:test-project view_products:test-project'
    );
  });
});

describe('toCustomError', () => {
  const upstream = (statusCode: number): { statusCode: number } => ({
    statusCode,
  });

  it.each([
    [404, 404],
    [409, 409],
    [429, 503],
    [500, 503],
    [503, 503],
    [401, 502],
    [403, 502],
    [400, 500],
  ])('maps upstream %i to %i', (from, to) => {
    expect(toCustomError(upstream(from), 'test').statusCode).toBe(to);
  });

  it('maps an unknown error to 500', () => {
    expect(toCustomError(new Error('boom'), 'test').statusCode).toBe(500);
  });

  it('returns an existing CustomError unchanged', () => {
    const e = new CustomError(418, 'teapot');
    expect(toCustomError(e, 'test')).toBe(e);
  });
});
