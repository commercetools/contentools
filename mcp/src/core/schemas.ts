/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';

export const businessUnitKey = z
  .string()
  .min(1)
  .max(128)
  .optional()
  .describe('Business unit key. Omit to use the server default.');

export const itemKey = (what: string) =>
  z.string().min(1).max(256).describe(`${what} key`);

export const PuckDataSchema = z
  .object({
    content: z.array(z.record(z.string(), z.unknown())),
    root: z.record(z.string(), z.unknown()),
    zones: z
      .record(z.string(), z.array(z.record(z.string(), z.unknown())))
      .optional(),
  })
  .passthrough()
  .describe(
    'Puck editor data: { content: [...components], root: {...} (required by the service; use {} when empty), zones?: {...} }'
  );

export const CONFIG_SLICES = [
  'theme',
  'header',
  'facet',
  'footer',
  'site-metadata',
  'category-listing',
  'translations',
  'b2b-account-menu-links',
] as const;

export const seg = encodeURIComponent;

export const bu = (
  input: { businessUnitKey?: string | undefined },
  def: string
): string => `/${seg(input.businessUnitKey ?? def)}`;
