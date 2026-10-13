/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';
import { puckData } from './puck-data';

const name = z
  .string({ error: 'name is required' })
  .min(1, 'name is required')
  .max(256);
const slug = z
  .string({ error: 'slug is required' })
  .min(1, 'slug is required')
  .max(512);
const meta = z.record(z.string(), z.unknown());

export const pageCreate = z.object({
  name,
  slug,
  puckData: puckData.optional(),
  meta: meta.optional(),
});

/** Unknown keys are stripped: this is the update whitelist. */
export const pageUpdate = z
  .object({ name, slug, puckData, meta })
  .partial();

export type PageCreate = z.infer<typeof pageCreate>;
export type PageUpdate = z.infer<typeof pageUpdate>;
