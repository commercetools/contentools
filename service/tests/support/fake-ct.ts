/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { http, HttpResponse, passthrough } from 'msw';
import { createStore, route, type FakeStore } from './fake-ct-store';

export const API = 'http://api.ct.test'; // == CTP_API_URL in env.ts
export const AUTH = 'http://auth.ct.test'; // == CTP_AUTH_URL

export let store: FakeStore = createStore();
export const resetStore = (): void => {
  store = createStore();
};

async function respond(request: Request) {
  const url = new URL(request.url);
  const text = request.method === 'GET' || request.method === 'DELETE' ? '' : await request.text();
  let body: unknown;
  if (text && (request.headers.get('content-type') ?? '').includes('json')) body = JSON.parse(text);
  const r = route(store, request.method, url.pathname, url.searchParams, body);
  return HttpResponse.json(r.body as object, { status: r.status });
}

export const handlers = [
  // supertest talks to an ephemeral loopback server: let it through untouched.
  http.all(/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//, () => passthrough()),
  http.all(`${AUTH}/*`, ({ request }) => respond(request)),
  http.all(`${API}/*`, ({ request }) => respond(request)),
];
