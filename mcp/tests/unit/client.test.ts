/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { ContentoolsClient, ServiceError } from '../../src/core';

const BASE = 'https://svc.test/service';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = (timeoutMs = 2000) =>
  new ContentoolsClient({ baseUrl: BASE, token: 'T'.repeat(40), timeoutMs });

async function failure(p: Promise<unknown>): Promise<ServiceError> {
  try {
    await p;
  } catch (e) {
    return e as ServiceError;
  }
  throw new Error('expected failure');
}

test('sends auth, source and correlation headers; JSON body', async () => {
  let seen: Record<string, unknown> = {};
  server.use(
    http.post(`${BASE}/x`, async ({ request }) => {
      seen = {
        auth: request.headers.get('authorization'),
        source: request.headers.get('x-source'),
        cid: request.headers.get('x-correlation-id'),
        ct: request.headers.get('content-type'),
        body: await request.json(),
      };
      return HttpResponse.json({ ok: true });
    })
  );
  const r = await client().execute({ method: 'POST', path: '/x', body: { a: 1 } }, 'cid-1');
  expect(r).toEqual({ ok: true });
  expect(seen).toEqual({
    auth: `Bearer ${'T'.repeat(40)}`,
    source: 'mcp',
    cid: 'cid-1',
    ct: 'application/json',
    body: { a: 1 },
  });
});

test('204 resolves to undefined', async () => {
  server.use(http.delete(`${BASE}/x`, () => new HttpResponse(null, { status: 204 })));
  await expect(client().execute({ method: 'DELETE', path: '/x' })).resolves.toBeUndefined();
});

test('404 JSON message', async () => {
  server.use(http.get(`${BASE}/x`, () => HttpResponse.json({ message: 'nope' }, { status: 404 })));
  const e = await failure(client().execute({ method: 'GET', path: '/x' }));
  expect([e.status, e.message]).toEqual([404, 'Service returned 404: nope']);
});

test('500 html is truncated to 500 characters', async () => {
  server.use(http.get(`${BASE}/x`, () => new HttpResponse('<html>' + 'x'.repeat(2000), { status: 500 })));
  const e = await failure(client().execute({ method: 'GET', path: '/x' }));
  expect(e.status).toBe(500);
  expect(e.message.length).toBeLessThanOrEqual(500);
  expect(e.message.startsWith('Service returned 500: <html>')).toBe(true);
});

test('timeout maps to 504', async () => {
  server.use(http.get(`${BASE}/x`, async () => { await delay('infinite'); return HttpResponse.json({}); }));
  const e = await failure(client(50).execute({ method: 'GET', path: '/x' }));
  expect(e.status).toBe(504);
  expect(e.message).toBe('Service request timed out after 50 ms');
});

test('network error maps to 502 without the URL', async () => {
  server.use(http.get(`${BASE}/x`, () => HttpResponse.error()));
  const e = await failure(client().execute({ method: 'GET', path: '/x' }));
  expect(e.status).toBe(502);
  expect(e.message).toBe('Service is unreachable');
  expect(e.message).not.toContain('svc.test');
});

test('spec-E error body with code and correlation id', async () => {
  server.use(
    http.get(`${BASE}/x`, () =>
      HttpResponse.json(
        { message: 'Media storage is not configured', statusCode: 501, correlationId: 'c-1', code: 'MEDIA_NOT_CONFIGURED' },
        { status: 501 }
      )
    )
  );
  const e = await failure(client().execute({ method: 'GET', path: '/x' }));
  expect(e.message).toBe(
    'Service returned 501 MEDIA_NOT_CONFIGURED: Media storage is not configured (correlationId c-1)'
  );
});

test('errors are appended compactly within 500 characters', async () => {
  server.use(
    http.get(`${BASE}/x`, () =>
      HttpResponse.json(
        { message: 'Invalid', statusCode: 400, errors: [{ path: 'slug', message: 'required' }] },
        { status: 400 }
      )
    )
  );
  const e = await failure(client().execute({ method: 'GET', path: '/x' }));
  expect(e.message).toBe('Service returned 400: Invalid [{"path":"slug","message":"required"}]');
  server.use(
    http.get(`${BASE}/y`, () =>
      HttpResponse.json({ message: 'Invalid', errors: ['e'.repeat(2000)] }, { status: 400 })
    )
  );
  const long = await failure(client().execute({ method: 'GET', path: '/y' }));
  expect(long.message.length).toBeLessThanOrEqual(500);
});

test('multipart upload carries file and fields', async () => {
  let seen: { name?: string; bytes?: string; title?: unknown } = {};
  server.use(
    http.post(`${BASE}/up`, async ({ request }) => {
      const form = await request.formData();
      const file = form.get('file') as File;
      seen = { name: file.name, bytes: Buffer.from(await file.arrayBuffer()).toString('utf8'), title: form.get('title') };
      return HttpResponse.json({ url: 'u' }, { status: 201 });
    })
  );
  await client().execute({
    method: 'POST',
    path: '/up',
    multipart: { fields: { title: 'T', description: '' }, file: { name: 'a.txt', contentBase64: Buffer.from('hello').toString('base64') } },
  });
  expect(seen).toEqual({ name: 'a.txt', bytes: 'hello', title: 'T' });
});
