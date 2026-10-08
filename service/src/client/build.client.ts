import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { authMiddlewareOptions } from '../middleware/auth.middleware';
import { httpMiddlewareOptions } from '../middleware/http.middleware';
import { readConfiguration } from '../utils/config.utils';
import { AuthenticatedRequest } from '../types/service.types';

/**
 * Create a new client builder.
 * This code creates a new Client that can be used to make API calls
 */
export const createClient = (req: AuthenticatedRequest) =>
  new ClientBuilder()
    .withProjectKey(readConfiguration(req).projectKey)
    .withClientCredentialsFlow(authMiddlewareOptions(req))
    .withHttpMiddleware(httpMiddlewareOptions(req))
    .build();
