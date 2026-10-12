/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const resolveDatasourceApi = (
  client: PuckClient,
  datasourceKey: string,
  body: { params: Record<string, string> }
) =>
  client.request<unknown>(
    'resolveDatasourceApi',
    `/datasource/${enc(datasourceKey)}/test`,
    { method: 'POST', body }
  );
