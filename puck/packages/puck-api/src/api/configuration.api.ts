import type { ImportResult, ThemeTokens } from '@commercetools-demo/puck-types';

const readHeaders = (projectKey: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-project-key': projectKey,
});

const writeHeaders = (
  projectKey: string,
  jwtToken: string
): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-project-key': projectKey,
  Authorization: `Bearer ${jwtToken}`,
});

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[puck-api] HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export const getThemeApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string
): Promise<ThemeTokens | null> => {
  const res = await fetch(
    `${baseURL}/${businessUnitKey}/configuration/theme`,
    { headers: readHeaders(projectKey) }
  );
  if (res.status === 404) return null;
  return handleResponse<ThemeTokens>(res);
};

export const createThemeApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  value: ThemeTokens
): Promise<ThemeTokens> => {
  const res = await fetch(
    `${baseURL}/${businessUnitKey}/configuration/theme`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify({ value }),
    }
  );
  return handleResponse<ThemeTokens>(res);
};

export const updateThemeApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string,
  value: ThemeTokens
): Promise<ThemeTokens> => {
  const res = await fetch(
    `${baseURL}/${businessUnitKey}/configuration/theme`,
    {
      method: 'PUT',
      headers: writeHeaders(projectKey, jwtToken),
      body: JSON.stringify({ value }),
    }
  );
  return handleResponse<ThemeTokens>(res);
};

export const importDefaultContentTypesApi = async (
  baseURL: string,
  projectKey: string,
  jwtToken: string,
  businessUnitKey: string
): Promise<ImportResult> => {
  const res = await fetch(
    `${baseURL}/${businessUnitKey}/content-type/import`,
    {
      method: 'POST',
      headers: writeHeaders(projectKey, jwtToken),
    }
  );
  return handleResponse<ImportResult>(res);
};
