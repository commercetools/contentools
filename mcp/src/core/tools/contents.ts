/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { buildEqualsPredicate } from '../predicate';
import { PuckDataSchema, bu, businessUnitKey, itemKey, seg } from '../schemas';
import { defineTool } from '../types';

const key = itemKey('Content');
const field = z.enum(['key', 'name', 'contentType']);
const meta = z
  .object({
    description: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();
const updateValue = z
  .object({
    name: z.string().min(1).optional(),
    contentType: z.string().min(1).optional(),
    data: PuckDataSchema.optional(),
    meta: meta.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'at least one field');

export const contentsTools = [
  defineTool({
    name: 'list_puck_contents',
    title: 'List Puck contents',
    group: 'contents',
    access: 'read',
    description:
      'List reusable content items (not pages) of the business unit. Optionally filter by contentType.',
    shape: { businessUnitKey, contentType: z.string().min(1).max(256).optional() },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents${
        i.contentType ? `?contentType=${seg(i.contentType)}` : ''
      }`,
    }),
  }),
  defineTool({
    name: 'get_puck_content',
    title: 'Get Puck content',
    group: 'contents',
    access: 'read',
    description: 'Get one content item by key, including its draft and published states.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'get_published_puck_content',
    title: 'Get published Puck content',
    group: 'contents',
    access: 'read',
    description: 'Get the PUBLISHED version of a content item by key.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/published/puck-contents/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'get_preview_puck_content',
    title: 'Get preview Puck content',
    group: 'contents',
    access: 'read',
    description:
      'Get the PREVIEW version of a content item by key: the draft if one exists, otherwise the published version.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/preview/puck-contents/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'query_published_puck_content',
    title: 'Find published content',
    group: 'contents',
    access: 'read',
    description:
      'Find PUBLISHED content items where the chosen field (key, name or contentType) equals the value.',
    shape: { businessUnitKey, field, value: z.string().min(1).max(200) },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/published/puck-contents/query`,
      body: { query: buildEqualsPredicate(i.field, i.value) },
    }),
  }),
  defineTool({
    name: 'query_preview_puck_content',
    title: 'Find preview content',
    group: 'contents',
    access: 'read',
    description:
      'Find content items where the chosen field (key, name or contentType) equals the value, returning the PREVIEW version (draft if present).',
    shape: { businessUnitKey, field, value: z.string().min(1).max(200) },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/preview/puck-contents/query`,
      body: { query: buildEqualsPredicate(i.field, i.value) },
    }),
  }),
  defineTool({
    name: 'get_puck_content_states',
    title: 'Get Puck content states',
    group: 'contents',
    access: 'read',
    description: 'Get the draft and PUBLISHED states of a content item side by side.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}/states`,
    }),
  }),
  defineTool({
    name: 'get_puck_content_versions',
    title: 'Get Puck content versions',
    group: 'contents',
    access: 'read',
    description: 'List the saved versions (history) of a content item, newest first.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'GET',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}/versions`,
    }),
  }),
  defineTool({
    name: 'create_puck_content',
    title: 'Create Puck content',
    group: 'contents',
    access: 'write',
    description:
      'Create a content item as a draft. Does NOT publish; call publish_puck_content afterwards. WRITES data.',
    shape: {
      businessUnitKey,
      value: z
        .object({
          name: z.string().min(1),
          contentType: z.string().min(1),
          data: PuckDataSchema.optional(),
          meta: meta.optional(),
        })
        .strict(),
    },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'update_puck_content',
    title: 'Update Puck content',
    group: 'contents',
    access: 'write',
    description:
      'Update fields of a content item; saved as a draft, the PUBLISHED version is unchanged until publish_puck_content. WRITES data.',
    shape: { businessUnitKey, key, value: updateValue },
    request: (i, c) => ({
      method: 'PUT',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}`,
      body: { value: i.value },
    }),
  }),
  defineTool({
    name: 'delete_puck_content',
    title: 'Delete Puck content',
    group: 'contents',
    access: 'write',
    description:
      'Permanently delete a content item with all states and versions. WRITES data and cannot be undone.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}`,
    }),
  }),
  defineTool({
    name: 'publish_puck_content',
    title: 'Publish Puck content',
    group: 'contents',
    access: 'write',
    description:
      'Publish the current draft of a content item. Set clearDraft to true to also remove the draft. WRITES data (changes the PUBLISHED content).',
    shape: { businessUnitKey, key, clearDraft: z.boolean().optional() },
    request: (i, c) => ({
      method: 'PUT',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}/states/published${
        i.clearDraft === true ? '?clearDraft=true' : ''
      }`,
    }),
  }),
  defineTool({
    name: 'revert_puck_content_draft',
    title: 'Revert Puck content draft',
    group: 'contents',
    access: 'write',
    description:
      'Discard the draft of a content item so the PUBLISHED version is current again. WRITES data.',
    shape: { businessUnitKey, key },
    request: (i, c) => ({
      method: 'DELETE',
      path: `${bu(i, c.defaultBusinessUnitKey)}/puck-contents/${seg(i.key)}/states/draft`,
    }),
  }),
];
