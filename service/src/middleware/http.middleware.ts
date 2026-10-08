import { type HttpMiddlewareOptions } from '@commercetools/sdk-client-v2'; // Required for sending HTTP requests
import { readConfiguration } from '../utils/config.utils';
import { AuthenticatedRequest } from '../types/service.types';

/**
 * Configure Middleware. Example only. Adapt on your own
 */
export const httpMiddlewareOptions = (
  req: AuthenticatedRequest
): HttpMiddlewareOptions => {
  return {
    host: readConfiguration(req).apiUrl,
  };
};
