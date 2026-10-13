/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  CreatePuckTemplateInput,
  PuckTemplateKind,
  PuckTemplateListResponse,
  PuckTemplateResponse,
} from '@commercetools-labs/contentools-types';
import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const listPuckTemplatesApi = (
  client: PuckClient,
  kind?: PuckTemplateKind
) =>
  client.request<PuckTemplateListResponse>(
    'listPuckTemplatesApi',
    `/${client.businessUnitKey}/puck-templates`,
    { query: { kind } }
  );

export const createPuckTemplateApi = (
  client: PuckClient,
  body: { value: CreatePuckTemplateInput }
) =>
  client.request<PuckTemplateResponse>(
    'createPuckTemplateApi',
    `/${client.businessUnitKey}/puck-templates`,
    { method: 'POST', body }
  );

export const deletePuckTemplateApi = async (
  client: PuckClient,
  key: string
): Promise<void> => {
  await client.request<void>(
    'deletePuckTemplateApi',
    `/${client.businessUnitKey}/puck-templates/${enc(key)}`,
    { method: 'DELETE' }
  );
};
