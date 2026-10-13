/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { http, HttpResponse, passthrough } from 'msw';
import { createStore, ctError, route, type FakeStore } from './fake-ct-store';

export const API = 'https://api.ct.test'; // == CTP_API_URL in env.ts
export const AUTH = 'https://auth.ct.test'; // == CTP_AUTH_URL

export interface RecordedRequest {
  method: string;
  url: string;
  body?: unknown;
}

export let store: FakeStore = createStore();
/** Every request the fake received since the last reset (token calls included). */
export const requests: RecordedRequest[] = [];
let armedFailure: number | undefined;

export interface ProductSearchResult {
  id: string;
  productProjection?: Record<string, unknown>;
}

let searchResponder: (body: unknown) => ProductSearchResult[] = () => [];
let searchFailure: number | undefined;
const searchCalls: unknown[] = [];

/** Programmable Product Search API (POST /products/search). */
export const productSearch = {
  respondWith(fn: (body: unknown) => ProductSearchResult[]): void {
    searchResponder = fn;
    searchFailure = undefined;
  },
  failWith(status: number): void {
    searchFailure = status;
  },
  /** Bodies received since the last reset. */
  calls: searchCalls,
};

export const resetStore = (): void => {
  store = createStore();
  requests.length = 0;
  armedFailure = undefined;
  searchResponder = () => [];
  searchFailure = undefined;
  searchCalls.length = 0;
};
/** Alias used by tests: clears the store, the recorded requests and any armed failure. */
export const reset = resetStore;

/** Pre-load a custom object (version 1). */
export function seed(container: string, key: string, value: unknown): void {
  route(store, 'POST', '/test-project/custom-objects', new URLSearchParams(), { container, key, value });
  store.calls.pop();
}

/** Make the next custom-object write fail with this status (409 = ConcurrentModification). */
export function failNextWriteWith(status: number): void {
  armedFailure = status;
}

async function respond(request: Request) {
  const url = new URL(request.url);
  const text = request.method === 'GET' || request.method === 'DELETE' ? '' : await request.text();
  let body: unknown;
  const type = request.headers.get('content-type') ?? '';
  if (text && type.includes('json')) body = JSON.parse(text);
  const recorded = type.includes('x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(text)) : body;
  requests.push({ method: request.method, url: request.url, body: recorded });
  if (armedFailure && request.method === 'POST' && url.pathname.endsWith('/custom-objects')) {
    const status = armedFailure;
    armedFailure = undefined;
    const r = ctError(status, status === 409 ? 'ConcurrentModification' : 'Failure', 'simulated failure');
    return HttpResponse.json(r.body as object, { status: r.status });
  }
  const r = route(store, request.method, url.pathname, url.searchParams, body);
  return HttpResponse.json(r.body as object, { status: r.status });
}

async function respondSearch(request: Request) {
  const body = (await request.json()) as { limit?: number };
  searchCalls.push(body);
  requests.push({ method: request.method, url: request.url, body });
  if (searchFailure !== undefined) {
    const status = searchFailure;
    return HttpResponse.json(
      { statusCode: status, message: 'x', errors: [{ code: 'InvalidInput', message: 'x' }] },
      { status }
    );
  }
  const results = searchResponder(body);
  return HttpResponse.json({
    limit: body.limit ?? 20,
    offset: 0,
    count: results.length,
    total: results.length,
    results,
  });
}

export const handlers = [
  // supertest talks to an ephemeral loopback server: let it through untouched.
  http.all(/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//, () => passthrough()),
  http.all(`${AUTH}/*`, ({ request }) => respond(request)),
  http.post(`${API}/test-project/products/search`, ({ request }) => respondSearch(request)),
  http.all(`${API}/*`, ({ request }) => respond(request)),
];
