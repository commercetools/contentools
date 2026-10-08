/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  PuckContentStateResponse,
  PuckContentVersionResponse,
} from '@commercetools-labs/puck-types';
import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const getPuckContentStatesApi = (client: PuckClient, key: string) =>
  client.request<PuckContentStateResponse>(
    'getPuckContentStatesApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}/states`
  );

export const publishPuckContentApi = (
  client: PuckClient,
  key: string,
  clearDraft = false
) =>
  client.request<PuckContentStateResponse>(
    'publishPuckContentApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}/states/published`,
    { method: 'PUT', query: { clearDraft: clearDraft ? 'true' : undefined } }
  );

export const revertPuckContentDraftApi = (client: PuckClient, key: string) =>
  client.request<PuckContentStateResponse>(
    'revertPuckContentDraftApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}/states/draft`,
    { method: 'DELETE' }
  );

export const getPuckContentVersionsApi = (client: PuckClient, key: string) =>
  client.request<PuckContentVersionResponse>(
    'getPuckContentVersionsApi',
    `/${client.businessUnitKey}/puck-contents/${enc(key)}/versions`
  );
