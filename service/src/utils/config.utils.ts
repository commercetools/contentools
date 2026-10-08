import { AuthenticatedRequest } from '../types/service.types';
import { regionToCloudIdentifier } from './region';

/**
 * Read the configuration env vars
 * (Add yours accordingly)
 *
 * @returns The configuration with the correct env vars
 */
export const readConfiguration = (req: AuthenticatedRequest) => {
  const envVars = {
    clientId: req.project?.clientId ?? '',
    clientSecret: req.project?.clientSecret ?? '',
    projectKey: req.project?.projectKey ?? '',
    scope: req.project?.scope ?? '',
    authUrl: `https://auth.${regionToCloudIdentifier(req.project?.region)}.commercetools.com`,
    apiUrl: `https://api.${regionToCloudIdentifier(req.project?.region)}.commercetools.com`,
  };

  return envVars;
};
