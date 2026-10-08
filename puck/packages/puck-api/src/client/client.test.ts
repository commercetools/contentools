/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { PuckConnection } from '@commercetools-labs/puck-types';
import { describe, expect, it, vi } from 'vitest';
import { createPuckClient, fetcherFromFetch, updatePuckClient } from './client';
import { PuckAuthError, PuckHttpError } from './errors';
import { createFakeFetcher, fakeResponse } from './fake-fetcher';

const base = {
  baseURL: 'http://svc.test/service',
  businessUnitKey: 'main-store',
};

const connectionWith = (
  extra: Partial<PuckConnection>,
  fake = createFakeFetcher()
) => ({
  fake,
  client: createPuckClient({ ...base, fetcher: fake.fetcher, ...extra }),
});

describe('createPuckClient', () => {
  it('exposes serverMessage, code and correlationId parsed from the service error body', async () => {
    const { client } = connectionWith(
      {},
      createFakeFetcher(() =>
        fakeResponse(
          401,
          {
            message: 'Authentication required',
            statusCode: 401,
            correlationId: 'c1',
          },
          'Unauthorized'
        )
      )
    );
    const error = await client
      .request('getPuckPageApi', '/x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PuckAuthError);
    const failure = error as PuckAuthError;
    expect(failure.serverMessage).toBe('Authentication required');
    expect(failure.correlationId).toBe('c1');
    expect(failure.message).toBe(
      '[puck-api] HTTP 401: Authentication required'
    );

    const coded = createFakeFetcher(() =>
      fakeResponse(501, { message: 'x', code: 'X' })
    );
    const withCode = await connectionWith({}, coded)
      .client.request('fetchMediaLibraryApi', '/x')
      .catch((e: unknown) => e);
    expect((withCode as PuckHttpError).code).toBe('X');
  });

  it('sends only x-source on a public read without auth', async () => {
    const fake = createFakeFetcher();
    const client = createPuckClient({ ...base, fetcher: undefined });
    // public read through a global fetch spy, so no fetcher is configured
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('{}', { headers: { 'content-type': 'application/json' } })
      );
    await client.request(
      'getPublishedPuckPageApi',
      '/main-store/published/puck-pages/home'
    );
    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({ 'x-source': 'puck-api' });
    expect(fake.requests).toHaveLength(0);
  });

  it('sends Authorization and JSON headers on a write with jwtToken', async () => {
    const { client, fake } = connectionWith({ jwtToken: 'abc' });
    await client.request('updatePuckPageApi', '/p', {
      method: 'PUT',
      body: { a: 1 },
    });
    expect(fake.requests[0].headers).toEqual({
      'x-source': 'puck-api',
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(fake.requests[0].body).toBe('{"a":1}');
    expect(fake.requests[0].method).toBe('PUT');
  });

  it('lets an async getAuthHeaders win over jwtToken and evaluates it per request', async () => {
    let n = 0;
    const { client, fake } = connectionWith({
      jwtToken: 'static',
      getAuthHeaders: async () => ({ Authorization: `Bearer dyn-${++n}` }),
    });
    await client.request('getPuckPageApi', '/a');
    await client.request('getPuckPageApi', '/b');
    expect(fake.requests.map((r) => r.headers.Authorization)).toEqual([
      'Bearer dyn-1',
      'Bearer dyn-2',
    ]);
  });

  it('passes FormData through without a Content-Type header', async () => {
    const { client, fake } = connectionWith({ jwtToken: 't' });
    const form = new FormData();
    form.append('file', new File(['x'], 'a.png'));
    await client.request('uploadMediaFileApi', '/upload', {
      method: 'POST',
      body: form,
    });
    expect(fake.requests[0].body).toBe(form);
    expect(Object.keys(fake.requests[0].headers)).not.toContain('Content-Type');
  });

  it('rejects a protected call without auth before any I/O', async () => {
    const fake = createFakeFetcher();
    const client = createPuckClient(base);
    const spy = vi.spyOn(globalThis, 'fetch');
    const error = await client
      .request('listPuckPagesApi', '/main-store/puck-pages')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PuckAuthError);
    expect((error as PuckAuthError).authCode).toBe('PUCK_AUTH_REQUIRED');
    expect(spy).not.toHaveBeenCalled();
    expect(fake.requests).toHaveLength(0);
  });

  it('treats a configured fetcher as an auth source and adds no Authorization itself', async () => {
    const { client, fake } = connectionWith({});
    await client.request('listPuckPagesApi', '/main-store/puck-pages');
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0].headers).not.toHaveProperty('Authorization');
  });

  it('maps 401/403 to PuckAuthError (rejected) and 500 to a plain PuckHttpError', async () => {
    for (const status of [401, 403]) {
      const { client } = connectionWith(
        {},
        createFakeFetcher(() => fakeResponse(status, 'no'))
      );
      const error = await client
        .request('getPuckPageApi', '/x')
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PuckAuthError);
      expect((error as PuckAuthError).authCode).toBe('PUCK_AUTH_REJECTED');
    }
    const { client } = connectionWith(
      {},
      createFakeFetcher(() => fakeResponse(500, 'boom'))
    );
    const error = await client
      .request('getPuckPageApi', '/x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PuckHttpError);
    expect(error).not.toBeInstanceOf(PuckAuthError);
    expect((error as Error).message).toMatch(/^\[puck-api\] HTTP 500:/);
  });

  it('returns null on 404 with nullOn404 and undefined on 204', async () => {
    const notFound = connectionWith(
      {},
      createFakeFetcher(() => fakeResponse(404, 'x'))
    );
    await expect(
      notFound.client.request('getThemeApi', '/t', { nullOn404: true })
    ).resolves.toBeNull();
    const noContent = connectionWith(
      { jwtToken: 't' },
      createFakeFetcher(() => fakeResponse(204))
    );
    await expect(
      noContent.client.request('deletePuckPageApi', '/t', { method: 'DELETE' })
    ).resolves.toBeUndefined();
  });

  it('decides the policy of query calls by mode', async () => {
    const anonymous = createPuckClient(base);
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('{}', { headers: { 'content-type': 'application/json' } })
      );
    await expect(
      anonymous.request('queryPuckPageApi', '/q', {
        method: 'POST',
        body: {},
        mode: 'published',
      })
    ).resolves.toEqual({});
    await expect(
      anonymous.request('queryPuckPageApi', '/q', {
        method: 'POST',
        body: {},
        mode: 'preview',
      })
    ).rejects.toBeInstanceOf(PuckAuthError);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('keeps its identity when the connection is updated and uses the new token', async () => {
    const fake = createFakeFetcher();
    const connection: PuckConnection = {
      ...base,
      fetcher: fake.fetcher,
      jwtToken: 'one',
    };
    const client = createPuckClient(connection);
    await client.request('getPuckPageApi', '/a');
    updatePuckClient(client, { ...connection, jwtToken: 'two' });
    await client.request('getPuckPageApi', '/b');
    expect(fake.requests.map((r) => r.headers.Authorization)).toEqual([
      'Bearer one',
      'Bearer two',
    ]);
  });

  it('removes a trailing slash from baseURL and skips undefined query values', async () => {
    const { client, fake } = connectionWith({
      baseURL: 'http://svc.test/service///',
      jwtToken: 't',
    });
    await client.request('listPuckContentsApi', '/main-store/puck-contents', {
      query: { contentType: undefined, limit: 5 },
    });
    expect(fake.requests[0].url).toBe(
      'http://svc.test/service/main-store/puck-contents?limit=5'
    );
  });

  it('never sends a tenant header', async () => {
    const { client, fake } = connectionWith({ jwtToken: 't' });
    await client.request('getPuckPageApi', '/a');
    expect(
      Object.keys(fake.requests[0].headers).map((k) => k.toLowerCase())
    ).not.toContain(['x', 'project', 'key'].join('-'));
  });
});

describe('fetcherFromFetch', () => {
  it('adapts a fetch-shaped function', async () => {
    const spy = vi.fn().mockResolvedValue(fakeResponse(200, {}));
    const fetcher = fetcherFromFetch(spy);
    await fetcher({
      url: 'http://x/y',
      method: 'POST',
      headers: { a: 'b' },
      body: '{}',
    });
    expect(spy).toHaveBeenCalledWith('http://x/y', {
      method: 'POST',
      headers: { a: 'b' },
      body: '{}',
    });
  });
});
