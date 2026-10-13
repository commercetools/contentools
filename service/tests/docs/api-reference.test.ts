/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setupApiTest } from '../support/api';
import { listRoutes } from '../support/route-inventory';

/**
 * The route table of docs/api-reference.md must equal the mounted routes.
 * Auth middleware answers 401 for unknown paths too, so "status is not 404" cannot prove that a
 * route exists; the check walks the Express router stack instead (tests/support/route-inventory.ts).
 * The two media routes are built lazily and are not in the stack: they are probed with the service
 * token, where an unknown path answers 404 and a mounted one does not.
 */

const DOC = join(__dirname, '../../../docs/api-reference.md');
const MEDIA = new Set(['POST /:businessUnitKey/upload-file', 'GET /:businessUnitKey/media-library']);

const documented = readFileSync(DOC, 'utf8')
  .split('\n')
  .map((line) => /^\|[^|]*\|\s*(GET|POST|PUT|DELETE)\s*\|\s*`([^`]+)`/.exec(line))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => `${m[1]} ${(m[2] ?? '').replace(/:bu\b/g, ':businessUnitKey')}`);

describe('docs/api-reference.md', () => {
  it('has the expected number of rows and no duplicates', () => {
    expect(documented.length).toBeGreaterThan(70);
    expect(new Set(documented).size).toBe(documented.length);
  });

  it('documents exactly the mounted routes (except the lazily mounted media routes)', () => {
    const { app } = setupApiTest();
    const mounted = new Set(listRoutes(app).map((r) => `${r.method} ${r.path}`));
    const docs = new Set(documented.filter((d) => !MEDIA.has(d)));
    expect([...docs].filter((d) => !mounted.has(d))).toEqual([]);
    expect([...mounted].filter((m) => !docs.has(m))).toEqual([]);
  });

  it.each([...MEDIA])('%s is mounted', async (route) => {
    expect(documented).toContain(route);
    const [method, path] = route.split(' ') as [string, string];
    const { http, auth } = setupApiTest();
    const url = `/service${path.replace(':businessUnitKey', 'default')}`;
    const res = await (http as unknown as Record<string, (u: string) => { set: (h: Record<string, string>) => Promise<{ status: number }> }>)[
      method.toLowerCase()
    ](url).set(auth);
    expect(res.status).not.toBe(404);
  });
});
