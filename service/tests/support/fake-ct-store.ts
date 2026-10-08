/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * In-memory imitation of the few commercetools endpoints the service calls
 * (token, custom objects, product search). Framework-free and written with
 * syntax Node can strip (`node --experimental-strip-types`): no enums, no
 * constructor parameter properties. Reused by tools/fake-ct/server.mjs.
 */

export interface CustomObject {
  id: string;
  version: number;
  container: string;
  key: string;
  value: unknown;
  createdAt: string;
  lastModifiedAt: string;
}
export interface FakeResponse {
  status: number;
  body: unknown;
}
export interface FakeStore {
  objects: Map<string, CustomObject>;
  productSearch: unknown;
  seq: number;
  calls: Array<{ method: string; path: string }>;
}

export function createStore(): FakeStore {
  return { objects: new Map(), productSearch: { total: 0, offset: 0, limit: 20, hits: [] }, seq: 0, calls: [] };
}

/** commercetools-shaped error body */
export function ctError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): FakeResponse {
  return { status, body: { statusCode: status, message, errors: [{ code, message, ...extra }] } };
}

const objectKey = (container: string, key: string): string => `${container}|${key}`;

// ---------------------------------------------------------------------------
// where-predicate parser (only the forms the service uses)
// ---------------------------------------------------------------------------

/** Split on top-level `and` (case-insensitive), ignoring `and` inside quotes or parentheses. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') quote = !quote;
    else if (!quote && c === '(') depth++;
    else if (!quote && c === ')') depth--;
    else if (!quote && depth === 0 && /^\s+and\s+/i.test(s.slice(i))) {
      out.push(s.slice(start, i).trim());
      i += (s.slice(i).match(/^\s+and\s+/i) as RegExpMatchArray)[0].length - 1;
      start = i + 1;
    }
  }
  out.push(s.slice(start).trim());
  return out;
}

const parseList = (raw: string): string[] => {
  const items: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) items.push(m[1]);
  return items;
};

const getPath = (root: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, part) => (acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), root);

type Pred = (o: CustomObject) => boolean;

/** One comparison on a field accessor: `<f> = "v"` or `<f> in ("a","b")`. */
function comparison(clause: string, read: (field: string, o: CustomObject) => unknown): Pred {
  let m = clause.match(/^([A-Za-z_][\w.]*)\s*=\s*"((?:[^"\\]|\\.)*)"$/);
  if (m) {
    const [, field, want] = m;
    return (o) => read(field, o) === want;
  }
  m = clause.match(/^([A-Za-z_][\w.]*)\s+in\s*\((.*)\)$/i);
  if (m) {
    const [, field, list] = m;
    const wants = parseList(list);
    return (o) => wants.includes(String(read(field, o)));
  }
  throw new Error(clause);
}

export function parseWhere(where: string): (o: CustomObject) => boolean {
  const preds: Pred[] = splitTopLevel(where).map((clause) => {
    const v = clause.match(/^value\(([\s\S]*)\)$/i);
    if (v) {
      const inner = splitTopLevel(v[1]).map((c) => comparison(c, (f, o) => getPath(o.value, f)));
      return (o: CustomObject) => inner.every((p) => p(o));
    }
    if (/^(id|key|container)\b/.test(clause)) return comparison(clause, (f, o) => (o as unknown as Record<string, unknown>)[f]);
    throw new Error(clause);
  });
  return (o) => preds.every((p) => p(o));
}

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------

const listResponse = (results: CustomObject[], limit: number, offset: number, total: number): FakeResponse => ({
  status: 200,
  body: { limit, offset, count: results.length, total, results },
});

/** The single entry point: (method, "/proj/custom-objects/c/k", URLSearchParams, parsed JSON body) -> response */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function route(store: FakeStore, method: string, pathname: string, search: URLSearchParams, body: any): FakeResponse {
  store.calls.push({ method, path: pathname });
  const seg = pathname.split('/').filter(Boolean);

  if (method === 'POST' && pathname === '/oauth/token') {
    return {
      status: 200,
      body: { access_token: 'fake-access-token', token_type: 'Bearer', expires_in: 172800, scope: 'manage_key_value_documents:test-project' },
    };
  }

  const resource = seg[1];
  const now = new Date().toISOString();

  if (resource === 'custom-objects') {
    // POST /{pk}/custom-objects
    if (method === 'POST' && seg.length === 2) {
      if (!body || typeof body.container !== 'string' || typeof body.key !== 'string') {
        return ctError(400, 'InvalidInput', 'fake-ct: custom object needs "container" and "key"');
      }
      const k = objectKey(body.container, body.key);
      const cur = store.objects.get(k);
      if (!cur) {
        const created: CustomObject = {
          id: `fake-id-${++store.seq}`, version: 1, container: body.container, key: body.key, value: body.value, createdAt: now, lastModifiedAt: now,
        };
        store.objects.set(k, created);
        return { status: 201, body: created };
      }
      if (body.version !== undefined && body.version !== cur.version) {
        return ctError(
          409,
          'ConcurrentModification',
          `Object ${cur.id} has a different version than expected. Expected: ${body.version} - Actual: ${cur.version}.`,
          { currentVersion: cur.version }
        );
      }
      const updated: CustomObject = { ...cur, version: cur.version + 1, value: body.value, lastModifiedAt: now };
      store.objects.set(k, updated);
      return { status: 200, body: updated };
    }

    // GET|DELETE /{pk}/custom-objects/{container}/{key}
    if (seg.length === 4 && (method === 'GET' || method === 'DELETE')) {
      const [container, key] = [decodeURIComponent(seg[2]), decodeURIComponent(seg[3])];
      const cur = store.objects.get(objectKey(container, key));
      if (!cur) return ctError(404, 'ResourceNotFound', `The CustomObject with ID '${container}|${key}' was not found.`);
      if (method === 'GET') return { status: 200, body: cur };
      const want = search.get('version');
      if (want !== null && Number(want) !== cur.version) {
        return ctError(409, 'ConcurrentModification', `Object ${cur.id} has a different version than expected. Expected: ${want} - Actual: ${cur.version}.`, {
          currentVersion: cur.version,
        });
      }
      store.objects.delete(objectKey(container, key));
      return { status: 200, body: cur };
    }

    // GET /{pk}/custom-objects/{container}  and  GET /{pk}/custom-objects
    if (method === 'GET' && (seg.length === 3 || seg.length === 2)) {
      const container = seg.length === 3 ? decodeURIComponent(seg[2]) : undefined;
      let pred: Pred;
      try {
        const where = search.get('where');
        pred = where ? parseWhere(where) : () => true;
      } catch (e) {
        return ctError(400, 'InvalidInput', `fake-ct: unsupported where clause: ${(e as Error).message}`);
      }
      let all = [...store.objects.values()].filter((o) => (container === undefined || o.container === container) && pred(o));
      const sort = search.get('sort');
      if (sort) {
        const m = sort.trim().match(/^(createdAt|lastModifiedAt)(?:\s+(asc|desc))?$/);
        if (!m) return ctError(400, 'InvalidInput', `fake-ct: unsupported sort: ${sort}`);
        const f = m[1] as 'createdAt' | 'lastModifiedAt';
        const dir = m[2] === 'desc' ? -1 : 1;
        all = all.sort((a, b) => (a[f] < b[f] ? -1 : a[f] > b[f] ? 1 : 0) * dir);
      }
      const limit = Math.min(Number(search.get('limit') ?? 20) || 20, 500);
      const offset = Number(search.get('offset') ?? 0) || 0;
      return listResponse(all.slice(offset, offset + limit), limit, offset, all.length);
    }
  }

  if (method === 'POST' && resource === 'products' && seg[2] === 'search') {
    return { status: 200, body: store.productSearch };
  }

  return ctError(404, 'ResourceNotFound', `fake-ct: no route for ${method} ${pathname}`);
}
