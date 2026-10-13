/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { CONFIG_SLICES, bu, businessUnitKey, seg } from '../schemas';
import { defineTool } from '../types';

const slice = z
  .enum(CONFIG_SLICES)
  .describe(`Configuration slice: ${CONFIG_SLICES.join(', ')}`);

export const configurationTools = [
  defineTool({
    name: 'list_configurations',
    title: 'List configuration slices',
    group: 'configuration',
    access: 'read',
    description:
      'Get every site configuration slice of the business unit in one call (theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links).',
    shape: { businessUnitKey },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/configuration`,
    }),
  }),
  defineTool({
    name: 'get_configuration',
    title: 'Get configuration slice',
    group: 'configuration',
    access: 'read',
    description: 'Get one site configuration slice by name.',
    shape: { businessUnitKey, slice },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/configuration/${seg(i.slice)}`,
    }),
  }),
  defineTool({
    name: 'upsert_configuration',
    title: 'Create or replace configuration slice',
    group: 'configuration',
    access: 'write',
    description:
      'Create or fully REPLACE a site configuration slice. WRITES data and takes effect on the live site. Slice contents: theme = design tokens object; b2b-account-menu-links = array of {label, href}; header, facet, footer, site-metadata, category-listing and translations = free-form JSON objects (call get_configuration first and modify what it returns).',
    shape: {
      businessUnitKey,
      slice,
      value: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
    },
    request: (i, c) => ({
      method: 'PUT',
      path: `${bu(i, c.defaultBusinessUnitKey)}/configuration/${seg(i.slice)}`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'delete_configuration',
    title: 'Delete configuration slice',
    group: 'configuration',
    access: 'write',
    description: 'Delete a site configuration slice. WRITES data and cannot be undone.',
    shape: { businessUnitKey, slice },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/configuration/${seg(i.slice)}`,
    }),
  }),
];
