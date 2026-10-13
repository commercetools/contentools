/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { expectedRoutes } from '../support/expected-routes';
import { listRoutes, routeId } from '../support/route-inventory';
import { setupApiTest } from '../support/api';

const HEALTH = ['/health', '/status'];

describe('route inventory', () => {
  it('registers exactly the documented routes with the documented access', () => {
    const { app } = setupApiTest();
    const actual = listRoutes(app);
    expect(actual.length).toBeGreaterThan(0);
    const contentApi = actual.filter((r) => !HEALTH.includes(r.path));
    expect(contentApi.map(routeId).sort()).toEqual(expectedRoutes().map(routeId).sort());
    expect(contentApi).toHaveLength(74);
    // 73 routes: the conditional public datasource test is the 74th entry.
    expect(new Set(contentApi.map((r) => `${r.method} ${r.path}`)).size).toBe(73);
  });

  it('keeps the two health routes public', () => {
    const { app } = setupApiTest();
    const health = listRoutes(app).filter((r) => HEALTH.includes(r.path));
    expect(health.map((r) => `${r.method} ${r.path} ${r.access}`).sort()).toEqual([
      'GET /health public',
      'GET /status public',
    ]);
  });
});
