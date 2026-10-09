/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { itemKey, seg } from '../schemas';
import { defineTool } from '../types';

const key = itemKey('Datasource');
const datasourceValue = z
  .object({
    name: z.string().min(1),
    key: z.string().min(1),
    params: z.array(
      z.object({ key: z.string(), type: z.string(), required: z.boolean() }).strict()
    ),
    deployedUrl: z.string().url(),
  })
  .strict();

const TRUST = 'The service calls deployedUrl when the datasource is resolved; only register URLs you trust.';
const BUILTIN = 'Answers 409 for built-in datasources.';

// Datasource routes are not business-unit scoped.
export const datasourcesTools = [
  defineTool({
    name: 'list_datasources',
    title: 'List datasources',
    group: 'datasources',
    access: 'read',
    description:
      'List datasources (external or built-in data feeds a Puck component can bind to), including their parameters.',
    shape: {},
    request: () => ({ method: 'GET', path: '/datasource' }),
  }),
  defineTool({
    name: 'get_datasource',
    title: 'Get datasource',
    group: 'datasources',
    access: 'read',
    description: 'Get one datasource definition by key.',
    shape: { key },
    request: (i) => ({ method: 'GET', path: `/datasource/${seg(i.key)}` }),
  }),
  defineTool({
    name: 'create_datasource',
    title: 'Create datasource',
    group: 'datasources',
    access: 'write',
    description: `Register a datasource. WRITES data. ${TRUST} ${BUILTIN}`,
    shape: { key, value: datasourceValue },
    request: (i) => ({
      method: 'POST',
      path: `/datasource/${seg(i.key)}`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'update_datasource',
    title: 'Update datasource',
    group: 'datasources',
    access: 'write',
    description: `Replace a datasource definition. WRITES data. ${TRUST} ${BUILTIN}`,
    shape: { key, value: datasourceValue },
    request: (i) => ({
      method: 'PUT',
      path: `/datasource/${seg(i.key)}`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'delete_datasource',
    title: 'Delete datasource',
    group: 'datasources',
    access: 'write',
    description: `Delete a datasource. WRITES data and cannot be undone. ${BUILTIN}`,
    shape: { key },
    request: (i) => ({ method: 'DELETE', path: `/datasource/${seg(i.key)}` }),
  }),
  defineTool({
    name: 'test_datasource',
    title: 'Test datasource',
    group: 'datasources',
    access: 'write',
    description:
      'Resolve a datasource with sample parameters to see what it returns. Counted as a write because the service performs an outbound HTTP call to the datasource deployedUrl.',
    shape: { key, params: z.record(z.string(), z.unknown()).optional() },
    request: (i) => ({
      method: 'POST',
      path: `/datasource/${seg(i.key)}/test`,
      body: { params: i.params ?? {} },
    }),
  }),
];
