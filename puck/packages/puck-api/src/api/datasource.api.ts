import { httpClient, writeHeaders } from './http-client';

export const resolveDatasourceApi = async (
  baseURL: string,
  projectKey: string,
  _businessUnitKey: string,
  jwtToken: string,
  datasourceKey: string,
  body: { params: Record<string, string> }
): Promise<unknown> => {
  return httpClient<unknown>(
    `${baseURL}/datasource/${datasourceKey}/test`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify(body),
    }
  );
};
