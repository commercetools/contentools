import type { ComponentProps } from 'react';
// Imported from the connectors package: the shell's re-export is untyped in the published declarations.
import {
  buildApiUrl,
  executeHttpClientRequest,
} from '@commercetools-frontend/application-shell-connectors';
import type { PageManager } from '@commercetools-labs/contentools-page-manager';

/** The transport the puck managers accept (`PuckFetcher`: one request object in, a Response-like out). */
export type ServiceFetcher = NonNullable<
  ComponentProps<typeof PageManager>['fetcher']
>;

/**
 * A 2xx whose body is not JSON never comes from the service (a tunnel interstitial, a proxy error page).
 * Puck's client would resolve it to `undefined` and a list view would crash on it, so answer with an error
 * response instead: puck turns it into a typed error with a readable message.
 */
export const requireJsonBody = async (res: Response): Promise<Response> => {
  if (!res.ok || res.status === 204) return res;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res;
  if ((await res.clone().text()).trim() === '') return res;
  return new Response(
    JSON.stringify({
      message: `Expected a JSON response from the service but received ${
        contentType || 'no content type'
      }. Check that CONTENTOOLS_SERVICE_URL reaches the service and not a tunnel or proxy page.`,
    }),
    {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'application/json' },
    }
  );
};

/**
 * Sends a puck request through the Merchant Center `forward-to` proxy.
 * The gateway verifies the logged-in user, then calls the service with a short-lived signed JWT.
 * Non-2xx responses are returned as they are: puck's client turns them into typed errors.
 */
export const forwardToFetch: ServiceFetcher = ({
  url,
  method,
  headers,
  body,
}) =>
  executeHttpClientRequest<Response>(
    async (options) => {
      const outerHeaders: Record<string, string> = { ...options.headers };
      // The proxy request itself carries the JSON content type; multipart bodies get theirs from the browser.
      if (typeof body === 'string') {
        outerHeaders['Content-Type'] = 'application/json';
      }
      const res = await fetch(buildApiUrl('/proxy/forward-to'), {
        credentials: options.credentials,
        method,
        headers: outerHeaders,
        body,
      });
      return {
        data: res,
        statusCode: res.status,
        getHeader: (name: string) => res.headers.get(name),
      };
    },
    {
      forwardToConfig: {
        uri: url, // the FULL service URL including path and query
        // The shell prefixes these as `x-forward-header-*` so the proxy passes them on to the service.
        headers,
        audiencePolicy: 'forward-url-origin', // aud = service origin: one audience for every REST path
        includeUserPermissions: true, // sends the user's permissions as a claim
        version: 'v2',
      },
    }
  ).then(requireJsonBody);
