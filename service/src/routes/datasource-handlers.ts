/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { testDatasource } from '../controllers/datasource.controller';
import { parseOrThrow } from '../schemas/common';
import { testBody } from '../schemas/datasource';
import { param, wrap } from './params';

/** Shared by the public (opt-in, built-in keys only) and the protected route. */
export const testDatasourceHandler = wrap(async (req, res) => {
  const { params } = parseOrThrow(testBody, req.body ?? {});
  const result = await testDatasource(param(req, 'key'), params);
  res.status(200).json(result ?? null);
});
