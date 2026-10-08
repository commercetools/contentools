import type {
  PuckPageStateResponse,
  PuckPageVersionResponse,
} from '@commercetools-demo/puck-types';
import { httpClient, readHeaders, writeHeaders } from './http-client';

export const getPuckPageStatesApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageStateResponse> => {
  return httpClient<PuckPageStateResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}/states`,
    { headers: readHeaders(projectKey) }
  );
};

export const publishPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string,
  clearDraft = false
): Promise<PuckPageStateResponse> => {
  const url = new URL(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}/states/published`
  );
  if (clearDraft) url.searchParams.set('clearDraft', 'true');
  return httpClient<PuckPageStateResponse>(url.toString(), {
    method: 'PUT',
    headers: writeHeaders(projectKey, jwtToken),
  });
};

export const revertPuckPageDraftApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageStateResponse> => {
  return httpClient<PuckPageStateResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}/states/draft`,
    { method: 'DELETE', headers: writeHeaders(projectKey, jwtToken) }
  );
};

export const getPuckPageVersionsApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageVersionResponse> => {
  return httpClient<PuckPageVersionResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}/versions`,
    { headers: readHeaders(projectKey) }
  );
};
