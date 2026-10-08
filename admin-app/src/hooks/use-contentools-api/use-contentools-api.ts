import { useCallback } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';

export interface AuthenticateProjectRequest {
  ct_client_id: string;
  ct_client_secret: string;
  ct_project_key: string;
  ct_region: string;
  ct_scope: string;
}

export interface AuthenticateProjectResponse {
  token: string;
  expiresIn?: string;
  projectKey?: string;
}

const getBaseUrl = (url: string) => url.replace(/\/$/, '');

export const useContentoolsApi = () => {
  const { environment } = useApplicationContext<{ CMS_API_URL: string }>();
  const baseUrl = getBaseUrl(environment.CMS_API_URL ?? '');

  const authenticateProject = useCallback(
    async (
      request: AuthenticateProjectRequest
    ): Promise<AuthenticateProjectResponse> => {
      const response = await fetch(`${baseUrl}/authenticate-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message ||
            'Failed to authenticate project'
        );
      }

      return response.json();
    },
    [baseUrl]
  );

  return { authenticateProject, baseUrl };
};
