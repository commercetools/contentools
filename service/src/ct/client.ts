import { ClientBuilder } from '@commercetools/ts-client';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { getConfiguration, type Configuration } from '../config/env';

export type ProjectApiRoot = ReturnType<
  ReturnType<typeof createApiBuilderFromCtpClient>['withProjectKey']
>;

export function buildApiRoot(ctp: Configuration['ctp']): ProjectApiRoot {
  const client = new ClientBuilder()
    .withProjectKey(ctp.projectKey)
    .withClientCredentialsFlow({
      host: ctp.authUrl,
      projectKey: ctp.projectKey,
      credentials: { clientId: ctp.clientId, clientSecret: ctp.clientSecret },
      ...(ctp.scopes.length ? { scopes: ctp.scopes } : {}),
      httpClient: fetch,
    })
    .withHttpMiddleware({
      host: ctp.apiUrl,
      httpClient: fetch,
      timeout: 10_000,
      enableRetry: true,
      retryConfig: {
        maxRetries: 3,
        retryCodes: [429, 502, 503, 504],
        backoff: true,
      },
    })
    .build();
  return createApiBuilderFromCtpClient(client).withProjectKey({
    projectKey: ctp.projectKey,
  });
}

let root: ProjectApiRoot | undefined;

export const getApiRoot = (): ProjectApiRoot =>
  (root ??= buildApiRoot(getConfiguration().ctp));

export const resetApiRootForTests = (): void => {
  root = undefined;
};
