/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ComponentProps } from 'react';
// Imported from the connectors package: the shell's re-export is untyped in the published declarations.
import {
  buildApiUrl,
  executeHttpClientRequest,
} from '@commercetools-frontend/application-shell-connectors';
import type { PageManager } from '@commercetools-labs/puck-page-manager';

/** The transport the puck managers accept (`PuckFetcher`: one request object in, a Response-like out). */
export type ServiceFetcher = NonNullable<
  ComponentProps<typeof PageManager>['fetcher']
>;

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
  );
