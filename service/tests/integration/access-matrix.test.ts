/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest, type ApiTest } from '../support/api';
import { concretePath, expectedRoutes } from '../support/expected-routes';
import { createMcKit, type McKit } from '../support/mc';
import type { RouteInfo } from '../support/route-inventory';

jest.setTimeout(60_000);

let t: ApiTest;
let kit: McKit;
beforeAll(async () => {
  kit = await createMcKit();
});
beforeEach(() => {
  t = setupApiTest();
  t.server.use(...kit.handlers);
});

const WRONG = 'Bearer wrong-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const isConditionalPublic = (r: RouteInfo): boolean =>
  r.access === 'public' && r.path === '/datasource/:key/test';

const send = (
  r: RouteInfo,
  headers: Record<string, string>
): Promise<{ status: number }> => {
  const path = concretePath(r.path);
  const agent = t.http;
  switch (r.method) {
    case 'GET':
      return agent.get(path).set(headers);
    case 'POST':
      return agent.post(path).set(headers).send({});
    case 'PUT':
      return agent.put(path).set(headers).send({});
    default:
      return agent.delete(path).set(headers);
  }
};

const all = expectedRoutes();
const protectedRoutes = all.filter((r) => r.access === 'protected');
const publicRoutes = all.filter((r) => r.access === 'public' && !isConditionalPublic(r));
const label = (r: RouteInfo): string => `${r.method} ${r.path}`;

describe('protected routes', () => {
  it.each(protectedRoutes.map((r) => [label(r), r] as const))(
    '%s rejects anonymous and wrong tokens',
    async (_name, route) => {
      expect((await send(route, {})).status).toBe(401);
      expect((await send(route, { Authorization: WRONG })).status).toBe(401);
    }
  );

  it.each(protectedRoutes.map((r) => [label(r), r] as const))(
    '%s accepts the service token',
    async (_name, route) => {
      const { status } = await send(route, t.auth);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect(status).toBeLessThan(500);
    }
  );
});

describe('public routes', () => {
  it.each(publicRoutes.map((r) => [label(r), r] as const))(
    '%s ignores a garbage Authorization header',
    async (_name, route) => {
      const { status } = await send(route, { Authorization: 'Bearer garbage' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect(status).toBeLessThan(500);
    }
  );
});

describe('Merchant Center tokens', () => {
  const mc = async (projectKey: string) => ({
    authorization: `Bearer ${await kit.sign({ projectKey })}`,
    ...kit.headers(),
  });

  it('accepts a token for the configured project', async () => {
    const res = await t.http.get('/service/default/puck-pages').set(await mc('test-project'));
    expect(res.status).toBe(200);
  });

  it('rejects a token for another project with 403', async () => {
    const res = await t.http.get('/service/default/puck-pages').set(await mc('other-project'));
    expect(res.status).toBe(403);
  });
});
