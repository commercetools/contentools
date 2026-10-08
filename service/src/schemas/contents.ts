/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';

const name = z
  .string({ error: 'name is required' })
  .min(1, 'name is required')
  .max(256);
const contentType = z
  .string({ error: 'contentType is required' })
  .min(1, 'contentType is required')
  .max(256);
const record = z.record(z.string(), z.unknown());

export const contentCreate = z.object({
  name,
  contentType,
  data: record.optional(),
  meta: record.optional(),
});

/** Unknown keys are stripped: this is the update whitelist. */
export const contentUpdate = z
  .object({ name, contentType, data: record, meta: record })
  .partial();

export type ContentCreate = z.infer<typeof contentCreate>;
export type ContentUpdate = z.infer<typeof contentUpdate>;
