import type {
  PuckPageStateResponse,
  PuckPageVersionResponse,
} from '@commercetools-labs/contentools-types';
import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const getPuckPageStatesApi = (client: PuckClient, key: string) =>
  client.request<PuckPageStateResponse>(
    'getPuckPageStatesApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}/states`
  );

export const publishPuckPageApi = (
  client: PuckClient,
  key: string,
  clearDraft = false
) =>
  client.request<PuckPageStateResponse>(
    'publishPuckPageApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}/states/published`,
    { method: 'PUT', query: { clearDraft: clearDraft ? 'true' : undefined } }
  );

export const revertPuckPageDraftApi = (client: PuckClient, key: string) =>
  client.request<PuckPageStateResponse>(
    'revertPuckPageDraftApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}/states/draft`,
    { method: 'DELETE' }
  );

export const getPuckPageVersionsApi = (client: PuckClient, key: string) =>
  client.request<PuckPageVersionResponse>(
    'getPuckPageVersionsApi',
    `/${client.businessUnitKey}/puck-pages/${enc(key)}/versions`
  );
