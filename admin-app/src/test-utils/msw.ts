/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// msw 0.49 API on purpose (`rest` / `graphql`): the Merchant Center jest preset does not support msw 2. Do not bump it.
import { graphql, rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer();

/** Start/stop the shared server around a test file: call once at module level of the spec. */
export const useMockServer = () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

/** Answer a REST call, e.g. the Contentools service: `mockRest('get', 'http://localhost:8080/service/test-bu/puck-pages', [])`. */
export const mockRest = (
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  body: unknown,
  status = 200
) =>
  server.use(rest[method](url, (_req, res, ctx) => res(ctx.status(status), ctx.json(body as Record<string, unknown>))));

/**
 * Answer one query/mutation sent through the Merchant Center GraphQL proxy.
 * `target` is the `X-Graphql-Target` header value, e.g. `ctp` (commercetools API) or `mc` (Merchant Center API).
 */
export const mockGraphql = (
  operationName: string,
  data: Record<string, unknown>,
  target: 'ctp' | 'mc' = 'ctp'
) =>
  server.use(
    graphql.query(operationName, (req, res, ctx) =>
      req.headers.get('x-graphql-target') === target || !req.headers.has('x-graphql-target')
        ? res(ctx.data(data))
        : res(ctx.errors([{ message: `unexpected graphql target for ${operationName}` }]))
    )
  );
