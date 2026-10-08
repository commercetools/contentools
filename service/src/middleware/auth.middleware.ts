import { type AuthMiddlewareOptions } from '@commercetools/sdk-client-v2'; // Required for auth

import { readConfiguration } from '../utils/config.utils';
import { AuthenticatedRequest } from '../types/service.types';
/**
 * Configure Middleware. Example only. Adapt on your own
 */
export const authMiddlewareOptions = (
  req: AuthenticatedRequest
): AuthMiddlewareOptions => {
  const config = readConfiguration(req);
  return {
    host: config.authUrl,
    projectKey: config.projectKey,
    credentials: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    },
    scopes: [config.scope ? (config.scope as string) : 'default'],
  };
};
