/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  CreatePuckContentInput,
  PuckContentListResponse,
  PuckContentResponse,
  PuckContentWithStatesResponse,
  UpdatePuckContentInput,
} from '@commercetools-labs/puck-types';
import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const listPuckContentsApi = (client: PuckClient, contentType?: string) =>
  client.request<PuckContentListResponse>(
    'listPuckContentsApi',
    `/${client.businessUnitKey}/puck-contents`,
    { query: { contentType: contentType || undefined } }
  );

export const getPuckContentApi = (client: PuckClient, key: string) =>
  client.request<PuckContentWithStatesResponse>(
    'getPuckContentApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}`
  );

export const createPuckContentApi = (
  client: PuckClient,
  body: { value: CreatePuckContentInput }
) =>
  client.request<PuckContentResponse>(
    'createPuckContentApi',
    `/${client.businessUnitKey}/puck-contents`,
    { method: 'POST', body }
  );

export const updatePuckContentApi = (
  client: PuckClient,
  key: string,
  body: { value: UpdatePuckContentInput }
) =>
  client.request<PuckContentResponse>(
    'updatePuckContentApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}`,
    { method: 'PUT', body }
  );

export const deletePuckContentApi = async (
  client: PuckClient,
  key: string
): Promise<void> => {
  await client.request<void>(
    'deletePuckContentApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}`,
    { method: 'DELETE' }
  );
};

export const getPublishedPuckContentApi = (client: PuckClient, key: string) =>
  client.request<PuckContentResponse['value']>(
    'getPublishedPuckContentApi',
    `/${client.businessUnitKey}/published/puck-contents/${enc(key)}`
  );

export const getPreviewPuckContentApi = (client: PuckClient, key: string) =>
  client.request<PuckContentResponse['value']>(
    'getPreviewPuckContentApi',
    `/${client.businessUnitKey}/preview/puck-contents/${enc(key)}`
  );

export const queryPuckContentApi = (
  client: PuckClient,
  body: { query: string },
  mode: 'published' | 'preview'
) =>
  client.request<PuckContentResponse['value'] | null>(
    'queryPuckContentApi',
    `/${client.businessUnitKey}/${mode}/puck-contents/query`,
    { method: 'POST', body, nullOn404: true, mode }
  );
