/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { listenQuietly, startFakeCt } from '../support/fake-ct';

const API = 'https://api.test.local/test-project/custom-objects';
const fake = startFakeCt();

const post = (body: unknown): Promise<Response> =>
  fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeAll(() => listenQuietly(fake.server));
afterEach(() => fake.reset());
afterAll(() => fake.server.close());

describe('fake commercetools', () => {
  it('answers 404 for a missing object', async () => {
    const res = await fetch(`${API}/c/missing`);
    expect(res.status).toBe(404);
  });

  it('creates with 201 and version 1', async () => {
    const res = await post({ container: 'c', key: 'k', value: { a: 1 } });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { version: number }).version).toBe(1);
  });

  it('bumps the version on update', async () => {
    await post({ container: 'c', key: 'k', value: { a: 1 } });
    const res = await post({
      container: 'c',
      key: 'k',
      value: { a: 2 },
      version: 1,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { version: number }).version).toBe(2);
  });

  it('answers 409 for a stale version', async () => {
    await post({ container: 'c', key: 'k', value: {} });
    const res = await post({ container: 'c', key: 'k', value: {}, version: 7 });
    expect(res.status).toBe(409);
  });

  it('deletes an object and then reports 404', async () => {
    await post({ container: 'c', key: 'k', value: {} });
    const first = await fetch(`${API}/c/k`, { method: 'DELETE' });
    const second = await fetch(`${API}/c/k`, { method: 'DELETE' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
  });

  it('evaluates a value(...) predicate with AND and escapes', async () => {
    await post({ container: 'c', key: '1', value: { a: 'x', b: 'y' } });
    await post({ container: 'c', key: '2', value: { a: 'x', b: 'z' } });
    await post({ container: 'c', key: '3', value: { a: 'q"q', b: 'y' } });
    const where = encodeURIComponent('value(a = "x" AND b = "y")');
    const res = await fetch(`${API}/c?where=${where}`);
    const body = (await res.json()) as { results: { key: string }[] };
    expect(body.results.map((r) => r.key)).toEqual(['1']);

    const quoted = encodeURIComponent('value(a = "q\\"q")');
    const res2 = await fetch(`${API}/c?where=${quoted}`);
    const body2 = (await res2.json()) as { results: { key: string }[] };
    expect(body2.results.map((r) => r.key)).toEqual(['3']);
  });

  it('rejects an unsupported predicate loudly', async () => {
    await post({ container: 'c', key: 'k', value: {} });
    const res = await fetch(`${API}/c?where=${encodeURIComponent('foo > 3')}`);
    expect(res.status).toBe(500);
  });
});
