import { requireJsonBody, type ServiceFetcher } from './forward-to-fetcher';

/**
 * Sends a puck request straight to a local service, without the Merchant Center `forward-to` proxy
 * (the proxy only reaches public https URLs). The service cannot verify a Merchant Center session
 * locally, so the optional dev token (the service's SERVICE_API_TOKEN) is sent as the Bearer credential.
 */
export const createDirectFetch =
  (token?: string): ServiceFetcher =>
  ({ url, method, headers, body }) =>
    fetch(url, {
      method,
      headers: token
        ? { ...headers, Authorization: `Bearer ${token}` }
        : headers,
      body,
    }).then(requireJsonBody);
