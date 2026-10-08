/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../vitest.setup';
import { httpClient } from '../api/http-client';

const URL = 'http://svc.test/service/test-bu/puck-pages';

describe('httpClient', () => {
  it('returns the JSON body and tags the request with x-source: puck-api', async () => {
    let source: string | null = null;
    server.use(
      http.get(URL, ({ request }) => {
        source = request.headers.get('x-source');
        return HttpResponse.json([]);
      })
    );
    await expect(httpClient<unknown[]>(URL, { headers: {} })).resolves.toEqual([]);
    expect(source).toBe('puck-api');
  });

  it('throws "[puck-api] HTTP 500" on a server error', async () => {
    server.use(http.get(URL, () => new HttpResponse('boom', { status: 500 })));
    await expect(httpClient(URL, { headers: {} })).rejects.toThrow('[puck-api] HTTP 500');
  });
});
