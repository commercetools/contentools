/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PuckDataRenderer } from './PuckDataRenderer';
import { PuckRenderer } from './PuckRenderer';
import { jsonResponse, recordingFetcher } from './test-fetcher';

const BASE = 'http://svc.test/service';
const connection = { baseURL: BASE, businessUnitKey: 'main-store' };

const puckData = {
  root: { props: {} },
  content: [
    { type: 'TextBlock', props: { id: 't1', content: '<p>Hello published</p>' } },
  ],
};
const page = { key: 'home', puckData };

describe('PuckRenderer', () => {
  it('renders a published page anonymously with exactly one request and no Authorization', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(page), {
        headers: { 'content-type': 'application/json' },
      })
    );
    render(<PuckRenderer {...connection} pageKey="home" />);
    await screen.findByText('Hello published');
    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('does not request a preview without authentication', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    render(<PuckRenderer {...connection} pageKey="home" mode="preview" />);
    await screen.findByText(/authentication/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it('requests the preview with a token', async () => {
    const { fetcher, requests } = recordingFetcher(() => jsonResponse(200, page));
    render(
      <PuckRenderer
        {...connection}
        pageKey="home"
        mode="preview"
        jwtToken="t"
        fetcher={fetcher}
      />
    );
    await screen.findByText('Hello published');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(`${BASE}/main-store/preview/puck-pages/home`);
    expect(requests[0].headers.Authorization).toBe('Bearer t');
  });

  it('shows an error text instead of throwing without props and provider', () => {
    render(<PuckRenderer pageKey="home" />);
    expect(
      screen.getByText(
        'PuckRenderer needs baseURL and businessUnitKey or a PuckApiProvider'
      )
    ).toBeInTheDocument();
  });

  it('shows the not-found text when the slug query matches nothing', async () => {
    const { fetcher } = recordingFetcher(() => jsonResponse(404));
    render(<PuckRenderer {...connection} slug="/nope" fetcher={fetcher} />);
    await waitFor(() =>
      expect(screen.getByText('Page not found')).toBeInTheDocument()
    );
  });
});

describe('PuckDataRenderer', () => {
  it('renders product blocks from resolvedData without any provider or request', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    render(
      <PuckDataRenderer
        data={{
          root: { props: {} },
          content: [
            {
              type: 'ProductBanner',
              props: {
                id: 'p1',
                title: 'Featured',
                description: '',
                ctaText: '',
                ctaLink: '',
                productOnLeft: false,
                background: '#fff',
                product: {
                  type: 'product-by-sku',
                  skus: ['SKU-1'],
                  resolvedData: {
                    id: 'p1',
                    name: { 'en-US': 'Canvas Sneaker' },
                    masterVariant: { sku: 'SKU-1' },
                  },
                },
              },
            },
          ],
        }}
        locale="en-US"
      />
    );
    expect(screen.getByText('Canvas Sneaker')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
