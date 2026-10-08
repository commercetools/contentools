import type {
  CreatePuckTemplateInput,
  PuckTemplateKind,
  PuckTemplateListResponse,
  PuckTemplateResponse,
} from '@commercetools-demo/puck-types';
import { httpClient, readHeaders, writeHeaders } from './http-client';

export const listPuckTemplatesApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  kind?: PuckTemplateKind
): Promise<PuckTemplateListResponse> => {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return httpClient<PuckTemplateListResponse>(
    `${baseURL}/${businessUnitKey}/puck-templates${query}`,
    { headers: readHeaders(projectKey) }
  );
};

export const createPuckTemplateApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  body: { value: CreatePuckTemplateInput }
): Promise<PuckTemplateResponse> => {
  return httpClient<PuckTemplateResponse>(
    `${baseURL}/${businessUnitKey}/puck-templates`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};

export const deletePuckTemplateApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  await httpClient<void>(
    `${baseURL}/${businessUnitKey}/puck-templates/${key}`,
    { method: 'DELETE', headers: writeHeaders(projectKey, jwtToken) }
  );
};
