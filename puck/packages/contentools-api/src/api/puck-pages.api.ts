/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  CreatePuckPageInput,
  PuckPageListResponse,
  PuckPageResponse,
  PuckPageWithStatesResponse,
  UpdatePuckPageInput,
} from '@commercetools-labs/contentools-types';
import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const listPuckPagesApi = (client: PuckClient) =>
  client.request<PuckPageListResponse>(
    'listPuckPagesApi',
    `/${client.businessUnitKey}/puck-pages`
  );

export const getPuckPageApi = (client: PuckClient, key: string) =>
  client.request<PuckPageWithStatesResponse>(
    'getPuckPageApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}`
  );

export const createPuckPageApi = (
  client: PuckClient,
  body: { value: CreatePuckPageInput }
) =>
  client.request<PuckPageResponse>(
    'createPuckPageApi',
    `/${client.businessUnitKey}/puck-pages`,
    { method: 'POST', body }
  );

export const updatePuckPageApi = (
  client: PuckClient,
  key: string,
  body: { value: UpdatePuckPageInput }
) =>
  client.request<PuckPageResponse>(
    'updatePuckPageApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}`,
    { method: 'PUT', body }
  );

export const deletePuckPageApi = async (
  client: PuckClient,
  key: string
): Promise<void> => {
  await client.request<void>(
    'deletePuckPageApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}`,
    { method: 'DELETE' }
  );
};

export const getPublishedPuckPageApi = (client: PuckClient, key: string) =>
  client.request<PuckPageResponse['value']>(
    'getPublishedPuckPageApi',
    `/${client.businessUnitKey}/published/puck-pages/${enc(key)}`
  );

export const getPreviewPuckPageApi = (client: PuckClient, key: string) =>
  client.request<PuckPageResponse['value']>(
    'getPreviewPuckPageApi',
    `/${client.businessUnitKey}/preview/puck-pages/${enc(key)}`
  );

export const queryPuckPageApi = (
  client: PuckClient,
  body: { query: string },
  mode: 'published' | 'preview'
) =>
  client.request<PuckPageResponse['value'] | null>(
    'queryPuckPageApi',
    `/${client.businessUnitKey}/${mode}/puck-pages/query`,
    { method: 'POST', body, nullOn404: true, mode }
  );
