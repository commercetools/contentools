/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { deleteRunObjects } from './cleanup';
import { e2eEnabled } from './sandbox-guard';

// jest `setupFilesAfterEnv`: runs once per test file, after its tests.
afterAll(async () => {
  if (!e2eEnabled() || !process.env.E2E_RUN_ID) return;
  await deleteRunObjects(process.env.E2E_RUN_ID);
});
