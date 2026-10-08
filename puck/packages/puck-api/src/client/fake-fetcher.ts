/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  PuckFetcher,
  PuckRequest,
  PuckResponse,
} from '@commercetools-labs/puck-types';

/** Test helper (not exported from the package): builds a `PuckResponse` without a network. */
export const fakeResponse = (
  status: number,
  body?: unknown,
  statusText = ''
): PuckResponse => {
  const isJson = body !== undefined && typeof body !== 'string';
  const text =
    body === undefined ? '' : isJson ? JSON.stringify(body) : String(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' && isJson
          ? 'application/json'
          : null,
    },
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  };
};

export interface FakeFetcher {
  fetcher: PuckFetcher;
  requests: PuckRequest[];
}

/**
 * Test helper: records every request and answers with `respond(request)`; the default answers
 * `200 {}` JSON.
 */
export const createFakeFetcher = (
  respond: (
    request: PuckRequest
  ) => PuckResponse | Promise<PuckResponse> = () => fakeResponse(200, {})
): FakeFetcher => {
  const requests: PuckRequest[] = [];
  const fetcher: PuckFetcher = async (request) => {
    requests.push(request);
    return respond(request);
  };
  return { fetcher, requests };
};

/** Path (and query) of a recorded request relative to `baseURL`. */
export const pathOf = (request: PuckRequest, baseURL: string): string =>
  request.url.slice(baseURL.length);
