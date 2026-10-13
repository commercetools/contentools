/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  PuckConnection,
  PuckFetcher,
  PuckHttpMethod,
  PuckRequest,
  PuckResponse,
} from '@commercetools-labs/contentools-types';
import {
  PUCK_AUTH_POLICY,
  type PuckOp,
  type PuckRequestMode,
} from './auth-policy';
import { authRequiredError, PuckAuthError, PuckHttpError } from './errors';

export interface PuckRequestInit {
  method?: PuckHttpMethod;
  /** Object: sent as JSON. FormData: passed through (the transport sets the multipart boundary). */
  body?: unknown;
  /** Query parameters; `undefined` values are skipped. */
  query?: Record<string, string | number | undefined>;
  /** Resolve to `null` on 404 instead of throwing. */
  nullOn404?: boolean;
  /** Request mode, used by function-valued auth policies. */
  mode?: PuckRequestMode;
}

export interface PuckClient {
  readonly baseURL: string;
  readonly businessUnitKey: string;
  readonly locale: string | undefined;
  /** True when a `jwtToken`, `getAuthHeaders` or `fetcher` is configured. */
  readonly canAuthenticate: boolean;
  readonly publicDatasourceResolve: boolean;
  request<T>(op: PuckOp, path: string, init?: PuckRequestInit): Promise<T>;
}

/** Adapts anything shaped like `fetch` to a `PuckFetcher`. */
export const fetcherFromFetch =
  (f: typeof fetch): PuckFetcher =>
  (r: PuckRequest) =>
    f(r.url, { method: r.method, headers: r.headers, body: r.body });

// The only `fetch(` call in the packages.
const defaultFetcher: PuckFetcher = (r) =>
  fetch(r.url, { method: r.method, headers: r.headers, body: r.body });

const holders = new WeakMap<PuckClient, { current: PuckConnection }>();

export const buildUrl = (
  base: string,
  path: string,
  query?: Record<string, string | number | undefined>
): string => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(name, String(value));
  }
  const qs = params.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
};

/** React-free: usable in SSR and server code. */
export function createPuckClient(connection: PuckConnection): PuckClient {
  const holder = { current: connection };

  const client: PuckClient = {
    get baseURL() {
      return holder.current.baseURL.replace(/\/+$/, '');
    },
    get businessUnitKey() {
      return holder.current.businessUnitKey;
    },
    get locale() {
      return holder.current.locale;
    },
    get canAuthenticate() {
      const c = holder.current;
      return Boolean(c.jwtToken || c.getAuthHeaders || c.fetcher);
    },
    get publicDatasourceResolve() {
      return holder.current.publicDatasourceResolve === true;
    },
    async request<T>(
      op: PuckOp,
      path: string,
      init: PuckRequestInit = {}
    ): Promise<T> {
      const c = holder.current;
      const policy = PUCK_AUTH_POLICY[op];
      const level =
        typeof policy === 'function'
          ? policy(init.mode ?? 'published')
          : policy;
      const method = init.method ?? 'GET';
      const url = buildUrl(client.baseURL, path, init.query);

      if (level === 'protected' && !client.canAuthenticate) {
        throw authRequiredError(url, method);
      }

      const headers: Record<string, string> = { 'x-source': 'contentools-api' };
      let body: string | FormData | undefined;
      if (init.body instanceof FormData) {
        body = init.body;
      } else if (init.body !== undefined) {
        body = JSON.stringify(init.body);
        headers['Content-Type'] = 'application/json';
      }

      const auth = c.getAuthHeaders
        ? await c.getAuthHeaders()
        : c.jwtToken
          ? { Authorization: `Bearer ${c.jwtToken}` }
          : {};
      Object.assign(headers, auth);

      const res: PuckResponse = await (c.fetcher ?? defaultFetcher)({
        url,
        method,
        headers,
        body,
      });

      if (res.status === 404 && init.nullOn404) return null as T;
      if (!res.ok) {
        const text = await res.text();
        const failure = {
          status: res.status,
          statusText: res.statusText,
          body: text,
          url,
          method,
        };
        throw res.status === 401 || res.status === 403
          ? new PuckAuthError(failure, 'PUCK_AUTH_REJECTED')
          : new PuckHttpError(failure);
      }
      if (
        res.status === 204 ||
        !(res.headers.get('content-type') ?? '').includes('application/json')
      ) {
        return undefined as T; // accepted escape: callers type void/empty responses as T
      }
      return (await res.json()) as T; // the response shape is the caller's contract
    },
  };

  holders.set(client, holder);
  return client;
}

/** Internal: lets the React provider keep one client identity while props change. */
export function updatePuckClient(
  client: PuckClient,
  connection: PuckConnection
): void {
  const holder = holders.get(client);
  if (holder) holder.current = connection;
}
