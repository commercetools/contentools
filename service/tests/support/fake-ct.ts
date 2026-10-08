/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { http, HttpResponse } from 'msw';
import { setupServer, type SetupServer } from 'msw/node';

const API = 'https://api.test.local/test-project';
const AUTH = 'https://auth.test.local';

export interface StoredObject {
  id: string;
  version: number;
  container: string;
  key: string;
  value: unknown;
  createdAt: string;
  lastModifiedAt: string;
}

export interface RecordedRequest {
  method: string;
  url: string;
  body?: unknown;
}

const notFoundBody = {
  statusCode: 404,
  message: 'not found',
  errors: [{ code: 'ResourceNotFound', message: 'not found' }],
};

const dropNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(dropNulls);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, dropNulls(v)])
    );
  }
  return value;
};

type Token = { t: 'str' | 'word' | 'sym'; v: string };

function tokenize(where: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < where.length) {
    const c = where[i] as string;
    if (/\s/.test(c)) {
      i += 1;
    } else if (c === '"') {
      let out = '';
      i += 1;
      while (i < where.length && where[i] !== '"') {
        if (where[i] === '\\') {
          i += 1;
        }
        out += where[i];
        i += 1;
      }
      i += 1;
      tokens.push({ t: 'str', v: out });
    } else if ('(),='.includes(c)) {
      tokens.push({ t: 'sym', v: c });
      i += 1;
    } else {
      const m = /^[A-Za-z0-9_.-]+/.exec(where.slice(i));
      if (!m) {
        throw new Error(`fake-ct: unsupported predicate: ${where}`);
      }
      tokens.push({ t: 'word', v: m[0] });
      i += m[0].length;
    }
  }
  return tokens;
}

export function matches(obj: StoredObject, where: string): boolean {
  const tokens = tokenize(where);
  let pos = 0;
  const unsupported = (): never => {
    throw new Error(`fake-ct: unsupported predicate: ${where}`);
  };
  const peek = (): Token | undefined => tokens[pos];
  const isWord = (t: Token | undefined, w: string): boolean =>
    t?.t === 'word' && t.v.toLowerCase() === w;
  const isSym = (t: Token | undefined, s: string): boolean =>
    t?.t === 'sym' && t.v === s;
  const expectSym = (s: string): void => {
    if (!isSym(peek(), s)) {
      unsupported();
    }
    pos += 1;
  };

  const fieldOf = (scope: Record<string, unknown>, name: string): unknown =>
    scope[name];

  function parseOr(scope: Record<string, unknown>): boolean {
    let result = parseAnd(scope);
    while (isWord(peek(), 'or')) {
      pos += 1;
      const rhs = parseAnd(scope);
      result = result || rhs;
    }
    return result;
  }

  function parseAnd(scope: Record<string, unknown>): boolean {
    let result = parseAtom(scope);
    while (isWord(peek(), 'and')) {
      pos += 1;
      const rhs = parseAtom(scope);
      result = result && rhs;
    }
    return result;
  }

  function parseAtom(scope: Record<string, unknown>): boolean {
    if (isSym(peek(), '(')) {
      pos += 1;
      const r = parseOr(scope);
      expectSym(')');
      return r;
    }
    const field = peek();
    if (field?.t !== 'word') {
      return unsupported();
    }
    pos += 1;
    if (field.v === 'value' && isSym(peek(), '(')) {
      pos += 1;
      const inner =
        typeof scope.value === 'object' && scope.value !== null
          ? (scope.value as Record<string, unknown>)
          : {};
      const r = parseOr(inner);
      expectSym(')');
      return r;
    }
    const actual = fieldOf(scope, field.v);
    if (isSym(peek(), '=')) {
      pos += 1;
      const lit = peek();
      if (lit?.t !== 'str') {
        return unsupported();
      }
      pos += 1;
      return actual === lit.v;
    }
    if (isWord(peek(), 'in')) {
      pos += 1;
      expectSym('(');
      const values: string[] = [];
      while (peek()?.t === 'str') {
        values.push((peek() as Token).v);
        pos += 1;
        if (isSym(peek(), ',')) {
          pos += 1;
        }
      }
      expectSym(')');
      return typeof actual === 'string' && values.includes(actual);
    }
    return unsupported();
  }

  const result = parseOr(obj as unknown as Record<string, unknown>);
  if (pos !== tokens.length) {
    unsupported();
  }
  return result;
}

export interface FakeCt {
  server: SetupServer;
  store: FakeStore;
  requests: RecordedRequest[];
  reset(): void;
}

export class FakeStore {
  readonly objects = new Map<string, StoredObject>();
  private counter = 0;
  private armedFailure: number | undefined;

  failNextWriteWith(status: number): void {
    this.armedFailure = status;
  }

  takeFailure(): number | undefined {
    const status = this.armedFailure;
    this.armedFailure = undefined;
    return status;
  }

  nextId(): string {
    this.counter += 1;
    return `obj-${String(this.counter).padStart(8, '0')}`;
  }

  seed(container: string, key: string, value: unknown): StoredObject {
    const obj: StoredObject = {
      id: this.nextId(),
      version: 1,
      container,
      key,
      value,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };
    this.objects.set(`${container}/${key}`, obj);
    return obj;
  }

  clear(): void {
    this.objects.clear();
    this.counter = 0;
    this.armedFailure = undefined;
  }
}

export function startFakeCt(server: SetupServer = setupServer()): FakeCt {
  const store = new FakeStore();
  const requests: RecordedRequest[] = [];

  server.use(
    http.post(`${AUTH}/oauth/token`, async ({ request }) => {
      const text = await request.text();
      const form = new URLSearchParams(text);
      requests.push({
        method: 'POST',
        url: `${AUTH}/oauth/token`,
        body: Object.fromEntries(form.entries()),
      });
      return HttpResponse.json({
        access_token: 'fake',
        expires_in: 172800,
        token_type: 'Bearer',
        scope: form.get('scope') ?? '',
      });
    }),

    http.get(`${API}/custom-objects/:container/:key`, ({ request, params }) => {
      requests.push({ method: 'GET', url: request.url });
      const obj = store.objects.get(`${params.container}/${params.key}`);
      return obj
        ? HttpResponse.json(obj)
        : HttpResponse.json(notFoundBody, { status: 404 });
    }),

    http.delete(
      `${API}/custom-objects/:container/:key`,
      ({ request, params }) => {
        requests.push({ method: 'DELETE', url: request.url });
        const id = `${params.container}/${params.key}`;
        const obj = store.objects.get(id);
        if (!obj) {
          return HttpResponse.json(notFoundBody, { status: 404 });
        }
        store.objects.delete(id);
        return HttpResponse.json(obj);
      }
    ),

    http.post(`${API}/custom-objects`, async ({ request }) => {
      const body = (await request.json()) as {
        container: string;
        key: string;
        value: unknown;
        version?: number;
      };
      requests.push({ method: 'POST', url: request.url, body });
      const armed = store.takeFailure();
      if (armed) {
        return HttpResponse.json(
          {
            statusCode: armed,
            message: 'simulated failure',
            errors: [{ code: 'ConcurrentModification', message: 'simulated' }],
          },
          { status: armed }
        );
      }
      const id = `${body.container}/${body.key}`;
      const existing = store.objects.get(id);
      if (
        existing &&
        body.version !== undefined &&
        body.version !== existing.version
      ) {
        return HttpResponse.json(
          {
            statusCode: 409,
            message: `Object ${existing.id} has a different version than expected.`,
            errors: [
              {
                code: 'ConcurrentModification',
                message: 'different version',
                currentVersion: existing.version,
              },
            ],
          },
          { status: 409 }
        );
      }
      const now = new Date().toISOString();
      const obj: StoredObject = {
        id: existing?.id ?? store.nextId(),
        version: existing ? existing.version + 1 : 1,
        container: body.container,
        key: body.key,
        value: dropNulls(body.value),
        createdAt: existing?.createdAt ?? now,
        lastModifiedAt: now,
      };
      store.objects.set(id, obj);
      return HttpResponse.json(obj, { status: existing ? 200 : 201 });
    }),

    http.get(`${API}/custom-objects/:container`, ({ request, params }) => {
      requests.push({ method: 'GET', url: request.url });
      const url = new URL(request.url);
      const where = url.searchParams.get('where');
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 500);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const withTotal = url.searchParams.get('withTotal') !== 'false';
      try {
        const all = [...store.objects.values()]
          .filter((o) => o.container === params.container)
          .filter((o) => (where ? matches(o, where) : true))
          .sort((a, b) => a.id.localeCompare(b.id));
        const results = all.slice(offset, offset + limit);
        return HttpResponse.json({
          limit,
          offset,
          count: results.length,
          ...(withTotal && { total: all.length }),
          results,
        });
      } catch (error) {
        return HttpResponse.json(
          {
            statusCode: 500,
            message: error instanceof Error ? error.message : 'fake-ct failure',
          },
          { status: 500 }
        );
      }
    })
  );

  return {
    server,
    store,
    requests,
    reset(): void {
      store.clear();
      requests.length = 0;
    },
  };
}

export function listenQuietly(server: SetupServer): void {
  server.listen({
    onUnhandledRequest(req, print) {
      if (new URL(req.url).hostname === '127.0.0.1') {
        return;
      }
      print.error();
    },
  });
}
