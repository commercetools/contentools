/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { buildEqualsPredicate } from '../predicate';
import { PuckDataSchema, bu, businessUnitKey, itemKey, seg } from '../schemas';
import { defineTool } from '../types';

const key = itemKey('Page');
const meta = z
  .object({
    title: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .passthrough();
const slug = z.string().startsWith('/').max(200);
const updateValue = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().startsWith('/').optional(),
    puckData: PuckDataSchema.optional(),
    meta: meta.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'at least one field');

export const pagesTools = [
  defineTool({
    name: 'list_puck_pages',
    title: 'List Puck pages',
    group: 'pages',
    access: 'read',
    description:
      'List all Puck pages of the business unit (key, name, slug and state summary). Use this first to find page keys.',
    shape: { businessUnitKey },
    request: (i, c) => ({ method: 'GET', path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages` }),
  }),
  defineTool({
    name: 'get_puck_page',
    title: 'Get Puck page',
    group: 'pages',
    access: 'read',
    description:
      'Get one Puck page by key, including its draft and published states. Use list_puck_pages first to find keys.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'get_published_puck_page',
    title: 'Get published Puck page',
    group: 'pages',
    access: 'read',
    description:
      'Get the PUBLISHED version of a page by key (what visitors see). Fails with 404 when the page was never published.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/published/puck-pages/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'get_preview_puck_page',
    title: 'Get preview Puck page',
    group: 'pages',
    access: 'read',
    description:
      'Get the PREVIEW version of a page by key: the draft if one exists, otherwise the published version.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/preview/puck-pages/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'query_published_puck_page',
    title: 'Find published page by slug',
    group: 'pages',
    access: 'read',
    description:
      'Find the PUBLISHED page whose slug equals the given slug (for example "/home").',
    shape: { businessUnitKey, slug },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/published/puck-pages/query`,
      body: { query: buildEqualsPredicate('slug', i.slug) },
    }),
  }),
  defineTool({
    name: 'query_preview_puck_page',
    title: 'Find preview page by slug',
    group: 'pages',
    access: 'read',
    description:
      'Find the page whose slug equals the given slug, returning the PREVIEW version (draft if present).',
    shape: { businessUnitKey, slug },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/preview/puck-pages/query`,
      body: { query: buildEqualsPredicate('slug', i.slug) },
    }),
  }),
  defineTool({
    name: 'get_puck_page_states',
    title: 'Get Puck page states',
    group: 'pages',
    access: 'read',
    description: 'Get the draft and PUBLISHED states of a page side by side.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}/states`,
    }),
  }),
  defineTool({
    name: 'get_puck_page_versions',
    title: 'Get Puck page versions',
    group: 'pages',
    access: 'read',
    description: 'List the saved versions (history) of a page, newest first.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}/versions`,
    }),
  }),
  defineTool({
    name: 'create_puck_page',
    title: 'Create Puck page',
    group: 'pages',
    access: 'write',
    description:
      'Create a page as a draft. Does NOT publish; call publish_puck_page afterwards. WRITES data.',
    shape: {
      businessUnitKey,
      value: z
        .object({
          name: z.string().min(1),
          slug: z.string().startsWith('/'),
          puckData: PuckDataSchema.optional(),
          meta: meta.optional(),
        })
        .strict(),
    },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'update_puck_page',
    title: 'Update Puck page',
    group: 'pages',
    access: 'write',
    description:
      'Update fields of a page; the change is saved as a draft and does NOT change the published page until publish_puck_page is called. WRITES data.',
    shape: { businessUnitKey, key, value: updateValue },
    request: (i, c) => ({
      method: 'PUT',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'delete_puck_page',
    title: 'Delete Puck page',
    group: 'pages',
    access: 'write',
    description:
      'Permanently delete a page with all its states and versions. WRITES data and cannot be undone.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'publish_puck_page',
    title: 'Publish Puck page',
    group: 'pages',
    access: 'write',
    description:
      'Publish the current draft of a page so visitors see it. Set clearDraft to true to also remove the draft afterwards. WRITES data (changes the PUBLISHED page).',
    shape: { businessUnitKey, key, clearDraft: z.boolean().optional() },
    request: (i, c) => ({
      method: 'PUT',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}/states/published${
        i.clearDraft === true ? '?clearDraft=true' : ''
      }`,
    }),
  }),
  defineTool({
    name: 'revert_puck_page_draft',
    title: 'Revert Puck page draft',
    group: 'pages',
    access: 'write',
    description:
      'Discard the draft of a page so the PUBLISHED version is the current one again. WRITES data.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}/states/draft`,
    }),
  }),
];
