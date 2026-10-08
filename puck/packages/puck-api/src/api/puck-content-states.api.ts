import type {
  PuckContentStateResponse,
  PuckContentVersionResponse,
} from '@commercetools-demo/puck-types';
import { httpClient, readHeaders, writeHeaders } from './http-client';

export const getPuckContentStatesApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentStateResponse> => {
  return httpClient<PuckContentStateResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}/states`,
    { headers: readHeaders(projectKey) }
  );
};

export const publishPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string,
  clearDraft = false
): Promise<PuckContentStateResponse> => {
  const url = new URL(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}/states/published`
  );
  if (clearDraft) url.searchParams.set('clearDraft', 'true');
  return httpClient<PuckContentStateResponse>(url.toString(), {
    method: 'PUT',
    headers: writeHeaders(projectKey, jwtToken),
  });
};

export const revertPuckContentDraftApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentStateResponse> => {
  return httpClient<PuckContentStateResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}/states/draft`,
    { method: 'DELETE', headers: writeHeaders(projectKey, jwtToken) }
  );
};

export const getPuckContentVersionsApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentVersionResponse> => {
  return httpClient<PuckContentVersionResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}/versions`,
    { headers: readHeaders(projectKey) }
  );
};
