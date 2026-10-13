/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type {
  PuckFetcher,
  PuckRequest,
  PuckResponse,
} from '@commercetools-labs/contentools-types';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageManager, type PageManagerProps } from './PageManager';

const BASE = 'http://svc.test/service';

const pageItem = (key: string, name: string) => ({
  id: key,
  version: 1,
  container: 'puck-pages',
  key,
  value: {
    key,
    businessUnitKey: 'main-store',
    name,
    slug: `/${key}`,
    puckData: { root: { props: {} }, content: [] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  states: {},
});

const json = (body: unknown): PuckResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: (n) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) },
  text: async () => JSON.stringify(body),
  json: async () => body,
});

const setup = () => {
  const requests: PuckRequest[] = [];
  const fetcher: PuckFetcher = async (request) => {
    requests.push(request);
    return json([pageItem('home', 'Home page'), pageItem('about', 'About page')]);
  };
  return { requests, fetcher };
};

describe('PageManager', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('lists the pages through the fetcher without tenant or auth headers', async () => {
    const { requests, fetcher } = setup();
    render(
      <PageManager
        parentUrl="/"
        baseURL={BASE}
        businessUnitKey="main-store"
        fetcher={fetcher}
      />
    );
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.getByText('About page')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();

    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe(`${BASE}/main-store/puck-pages`);
    expect(Object.keys(requests[0].headers).map((k) => k.toLowerCase())).toEqual([
      'x-source',
    ]);
  });

  it('rejects the retired projectKey prop at compile time', () => {
    const props: PageManagerProps = {
      parentUrl: '/',
      baseURL: BASE,
      businessUnitKey: 'main-store',
      // @ts-expect-error projectKey no longer exists (single tenant)
      projectKey: 'legacy',
    };
    expect(props.parentUrl).toBe('/');
  });
});
