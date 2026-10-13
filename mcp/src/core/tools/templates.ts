/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { PuckDataSchema, bu, businessUnitKey, itemKey, seg } from '../schemas';
import { defineTool } from '../types';

const key = itemKey('Template');

export const templatesTools = [
  defineTool({
    name: 'list_puck_templates',
    title: 'List Puck templates',
    group: 'templates',
    access: 'read',
    description:
      'List templates (reusable Puck layouts to start a page or content item from). Optionally filter by kind.',
    shape: { businessUnitKey, kind: z.enum(['page', 'content']).optional() },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-templates${
        i.kind ? `?kind=${seg(i.kind)}` : ''
      }`,
    }),
  }),
  defineTool({
    name: 'get_puck_template',
    title: 'Get Puck template',
    group: 'templates',
    access: 'read',
    description: 'Get one template by key, including its Puck data.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-templates/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'create_puck_template',
    title: 'Create Puck template',
    group: 'templates',
    access: 'write',
    description: 'Create a template for pages or content items. WRITES data.',
    shape: {
      businessUnitKey,
      value: z
        .object({
          name: z.string().min(1),
          kind: z.enum(['page', 'content']),
          puckData: PuckDataSchema,
        })
        .strict(),
    },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-templates`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'delete_puck_template',
    title: 'Delete Puck template',
    group: 'templates',
    access: 'write',
    description: 'Permanently delete a template. WRITES data and cannot be undone.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-templates/${seg(i.key)}`,
    }),
  }),
];
