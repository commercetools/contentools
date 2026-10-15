import type { ImportResult, ThemeTokens } from '@commercetools-labs/contentools-types';
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
