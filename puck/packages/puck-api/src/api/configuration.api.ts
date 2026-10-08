/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ImportResult, ThemeTokens } from '@commercetools-labs/puck-types';
import type { PuckClient } from '../client/client';

export const getThemeApi = (client: PuckClient) =>
  client.request<ThemeTokens | null>(
    'getThemeApi',
    `/${client.businessUnitKey}/configuration/theme`,
    { nullOn404: true }
  );

export const createThemeApi = (client: PuckClient, value: ThemeTokens) =>
  client.request<ThemeTokens>(
    'createThemeApi',
    `/${client.businessUnitKey}/configuration/theme`,
    { method: 'POST', body: { value } }
  );

export const updateThemeApi = (client: PuckClient, value: ThemeTokens) =>
  client.request<ThemeTokens>(
    'updateThemeApi',
    `/${client.businessUnitKey}/configuration/theme`,
    { method: 'PUT', body: { value } }
  );

export const importDefaultContentTypesApi = (client: PuckClient) =>
  client.request<ImportResult>(
    'importDefaultContentTypesApi',
    `/${client.businessUnitKey}/content-type/import`,
    { method: 'POST' }
  );
