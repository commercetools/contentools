/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest } from '../support/api';

it('serves the health route through the shared harness', async () => {
  const t = setupApiTest();
  const res = await t.http.get('/service/health');
  expect(res.status).toBe(200);
});
