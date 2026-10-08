import type {
  CreatePuckContentInput,
  PuckContentListResponse,
  PuckContentResponse,
  PuckContentWithStatesResponse,
  UpdatePuckContentInput,
} from '@commercetools-demo/puck-types';
import { httpClient, readHeaders, writeHeaders } from './http-client';

export const listPuckContentsApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  contentType?: string
): Promise<PuckContentListResponse> => {
  const url = new URL(`${baseURL}/${businessUnitKey}/puck-contents`);
  if (contentType) url.searchParams.set('contentType', contentType);
  return httpClient<PuckContentListResponse>(url.toString(), {
    headers: readHeaders(projectKey),
  });
};

export const getPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentWithStatesResponse> => {
  return httpClient<PuckContentWithStatesResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const createPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  body: { value: CreatePuckContentInput }
): Promise<PuckContentResponse> => {
  return httpClient<PuckContentResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};

export const updatePuckContentApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string,
  body: { value: UpdatePuckContentInput }
): Promise<PuckContentResponse> => {
  return httpClient<PuckContentResponse>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}`,
    {
      method: 'PUT',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};

export const deletePuckContentApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  await httpClient<void>(
    `${baseURL}/${businessUnitKey}/puck-contents/${key}`,
    { method: 'DELETE', headers: writeHeaders(projectKey, jwtToken) }
  );
};

export const getPublishedPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentResponse['value']> => {
  return httpClient<PuckContentResponse['value']>(
    `${baseURL}/${businessUnitKey}/published/puck-contents/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const getPreviewPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  key: string
): Promise<PuckContentResponse['value']> => {
  return httpClient<PuckContentResponse['value']>(
    `${baseURL}/${businessUnitKey}/preview/puck-contents/${key}`,
    { headers: readHeaders(projectKey) }
  );
};

export const queryPuckContentApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  body: { query: string },
  mode: 'published' | 'preview'
): Promise<PuckContentResponse['value'] | null> => {
  return httpClient<PuckContentResponse['value'] | null>(
    `${baseURL}/${businessUnitKey}/${mode}/puck-contents/query`,
    {
      method: 'POST',
      headers: readHeaders(projectKey),
      body: JSON.stringify(body),
      nullOn404: true,
    }
  );
};
