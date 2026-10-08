/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';

export const queryBody = z.object({
  query: z
    .string({ error: 'query is required in request body' })
    .min(1, 'query is required in request body')
    .max(512),
});
