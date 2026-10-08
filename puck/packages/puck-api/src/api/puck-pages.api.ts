import type {
  CreatePuckPageInput,
  PuckPageListResponse,
  PuckPageResponse,
  PuckPageWithStatesResponse,
  UpdatePuckPageInput,
} from '@commercetools-demo/puck-types';
import { httpClient, readHeaders, writeHeaders } from './http-client';

export const listPuckPagesApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string
): Promise<PuckPageListResponse> => {
  return httpClient<PuckPageListResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages`,
    { headers: readHeaders(projectKey) }
  );
};

export const getPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageWithStatesResponse> => {
  return httpClient<PuckPageWithStatesResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const createPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  body: { value: CreatePuckPageInput }
): Promise<PuckPageResponse> => {
  return httpClient<PuckPageResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};

export const updatePuckPageApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string,
  body: { value: UpdatePuckPageInput }
): Promise<PuckPageResponse> => {
  return httpClient<PuckPageResponse>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}`,
    {
      method: 'PUT',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};

export const deletePuckPageApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  await httpClient<void>(
    `${baseURL}/${businessUnitKey}/puck-pages/${key}`,
    { method: 'DELETE', headers: writeHeaders(projectKey, jwtToken) }
  );
};

export const getPublishedPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageResponse['value']> => {
  return httpClient<PuckPageResponse['value']>(
    `${baseURL}/${businessUnitKey}/published/puck-pages/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const getPreviewPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckPageResponse['value']> => {
  return httpClient<PuckPageResponse['value']>(
    `${baseURL}/${businessUnitKey}/preview/puck-pages/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const queryPuckPageApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  body: { query: string },
  mode: 'published' | 'preview'
): Promise<PuckPageResponse['value'] | null> => {
  return httpClient<PuckPageResponse['value'] | null>(
    `${baseURL}/${businessUnitKey}/${mode}/puck-pages/query`,
    {
      method: 'POST',
      headers: readHeaders(projectKey),
      body: JSON.stringify(body),
      nullOn404: true,
    }
  );
};
