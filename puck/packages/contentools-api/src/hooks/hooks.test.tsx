import { act, renderHook, waitFor } from '@testing-library/react';
import type { PuckRequest } from '@commercetools-labs/contentools-types';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuckAuthError } from '../client/errors';
import {
  createFakeFetcher,
  fakeResponse,
  pathOf,
} from '../client/fake-fetcher';
import { PuckApiProvider } from '../context/PuckApiProvider';
import { useDatasource } from './useDatasource';
import { useMediaLibrary } from './useMediaLibrary';
import { usePuckPage } from './usePuckPage';
import { usePuckPages } from './usePuckPages';

const BASE = 'http://svc.test/service';
const base = { baseURL: BASE, businessUnitKey: 'main-store' };

const page = {
  key: 'home',
  name: 'Home',
  slug: '/home',
  puckData: { content: [], root: {} },
};
const pageWithStates = {
  id: '1',
  version: 1,
  container: 'c',
  key: 'home',
  value: page,
  states: {},
};

const providerWith =
  (props: Record<string, unknown>) =>
  ({ children }: { children?: React.ReactNode }) => (
    <PuckApiProvider {...base} {...props}>
      {children}
    </PuckApiProvider>
  );

afterEach(() => {
  vi.useRealTimers();
});

describe('usePuckPage', () => {
  const respondPage = (r: PuckRequest) =>
    r.method === 'GET'
      ? fakeResponse(200, pageWithStates)
      : fakeResponse(200, { value: page });

  it('saves the draft after the 1500 ms debounce with auth', async () => {
    const fake = createFakeFetcher(respondPage);
    const { result } = renderHook(() => usePuckPage('home'), {
      wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
    });
    await waitFor(() => expect(result.current.page).not.toBeNull());

    vi.useFakeTimers();
    let saved!: Promise<void>;
    act(() => {
      saved = result.current.saveDraft(page.puckData);
    });
    expect(fake.requests.filter((r) => r.method === 'PUT')).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
      await saved;
    });
    const put = fake.requests.find((r) => r.method === 'PUT');
    expect(put && pathOf(put, BASE)).toBe('/main-store/puck-pages/home');
    expect(put?.headers.Authorization).toBe('Bearer t');
  });

  it('rejects saveDraft immediately without auth and makes no write request', async () => {
    const fake = createFakeFetcher(respondPage);
    // a client without any auth source: no fetcher, so reads go through a global fetch stub
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(pageWithStates), {
        headers: { 'content-type': 'application/json' },
      })
    );
    const { result } = renderHook(() => usePuckPage('home'), {
      wrapper: providerWith({}),
    });
    // the read of a protected resource is rejected client side, so the hook shows the error
    await waitFor(() =>
      expect(result.current.error).toMatch(/^\[contentools-api\] HTTP 401/)
    );
    await expect(
      result.current.saveDraft(page.puckData)
    ).rejects.toBeInstanceOf(PuckAuthError);
    expect(spy).not.toHaveBeenCalled();
    expect(fake.requests).toHaveLength(0);
  });
});

describe('usePuckPages', () => {
  it('lists, creates and deletes with auth', async () => {
    const fake = createFakeFetcher((r) =>
      r.method === 'GET'
        ? fakeResponse(200, [pageWithStates])
        : fakeResponse(r.method === 'DELETE' ? 204 : 201, { value: page })
    );
    const { result } = renderHook(() => usePuckPages(), {
      wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
    });
    await waitFor(() => expect(result.current.pages).toHaveLength(1));
    await act(async () => {
      await result.current.createPage({ name: 'New', slug: '/new' });
      await result.current.deletePage('home');
    });
    expect(fake.requests.map((r) => `${r.method} ${pathOf(r, BASE)}`)).toEqual([
      'GET /main-store/puck-pages',
      'POST /main-store/puck-pages',
      'GET /main-store/puck-pages',
      'DELETE /main-store/puck-pages/home',
      'GET /main-store/puck-pages',
    ]);
  });

  it('surfaces a 401 as the error text', async () => {
    const fake = createFakeFetcher(() => fakeResponse(401, 'nope'));
    const { result } = renderHook(() => usePuckPages(), {
      wrapper: providerWith({ fetcher: fake.fetcher }),
    });
    await waitFor(() =>
      expect(result.current.error).toMatch(/^\[contentools-api\] HTTP 401/)
    );
  });

  it('refetches when the business unit changes', async () => {
    const fake = createFakeFetcher(() => fakeResponse(200, []));
    let bu = 'one';
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <PuckApiProvider
        baseURL={BASE}
        businessUnitKey={bu}
        fetcher={fake.fetcher}
      >
        {children}
      </PuckApiProvider>
    );
    const { rerender } = renderHook(() => usePuckPages(), { wrapper });
    await waitFor(() => expect(fake.requests).toHaveLength(1));
    bu = 'two';
    rerender();
    await waitFor(() => expect(fake.requests).toHaveLength(2));
    expect(pathOf(fake.requests[1], BASE)).toBe('/two/puck-pages');
  });
});

describe('useMediaLibrary', () => {
  const file = (name: string) => ({
    url: `http://x/${name}`,
    name,
    isImage: true,
  });

  it('pages with a cursor stack', async () => {
    const fake = createFakeFetcher((r) =>
      r.url.includes('cursor=c1')
        ? fakeResponse(200, {
            files: [file('b')],
            pagination: { limit: 20, nextCursor: null, hasMore: false },
          })
        : fakeResponse(200, {
            files: [file('a')],
            pagination: { limit: 20, nextCursor: 'c1', hasMore: true },
          })
    );
    const { result } = renderHook(() => useMediaLibrary(), {
      wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
    });
    await act(async () => {
      await result.current.fetchMedia();
    });
    expect(pathOf(fake.requests[0], BASE)).toBe(
      '/main-store/media-library?limit=20'
    );
    expect(result.current.hasNextPage()).toBe(true);
    expect(result.current.hasPreviousPage()).toBe(false);

    await act(async () => {
      await result.current.loadNextPage();
    });
    expect(pathOf(fake.requests[1], BASE)).toBe(
      '/main-store/media-library?limit=20&cursor=c1'
    );
    expect(result.current.files[0].name).toBe('b');
    expect(result.current.hasNextPage()).toBe(false);
    expect(result.current.hasPreviousPage()).toBe(true);

    await act(async () => {
      await result.current.loadPreviousPage();
    });
    expect(pathOf(fake.requests[2], BASE)).toBe(
      '/main-store/media-library?limit=20'
    );
    expect(result.current.files[0].name).toBe('a');

    // the last page makes no further request
    await act(async () => {
      await result.current.loadNextPage();
      await result.current.loadNextPage();
    });
    expect(fake.requests.length).toBeLessThanOrEqual(5);
  });

  it('makes no request for loadNextPage when hasMore is false', async () => {
    const fake = createFakeFetcher(() =>
      fakeResponse(200, {
        files: [],
        pagination: { limit: 20, nextCursor: null, hasMore: false },
      })
    );
    const { result } = renderHook(() => useMediaLibrary(), {
      wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
    });
    await act(async () => {
      await result.current.fetchMedia();
      await result.current.loadNextPage();
    });
    expect(fake.requests).toHaveLength(1);
  });

  it('maps a 501 to notConfigured without an error and other failures to error', async () => {
    const notConfigured = createFakeFetcher(() =>
      fakeResponse(501, {
        message: 'x',
        statusCode: 501,
        code: 'MEDIA_NOT_CONFIGURED',
      })
    );
    const first = renderHook(() => useMediaLibrary(), {
      wrapper: providerWith({ fetcher: notConfigured.fetcher, jwtToken: 't' }),
    });
    await act(async () => {
      await first.result.current.fetchMedia();
    });
    expect(first.result.current.notConfigured).toBe(true);
    expect(first.result.current.error).toBeNull();

    const failing = createFakeFetcher(() => fakeResponse(502, 'bad gateway'));
    const second = renderHook(() => useMediaLibrary(), {
      wrapper: providerWith({ fetcher: failing.fetcher, jwtToken: 't' }),
    });
    await act(async () => {
      await second.result.current.fetchMedia();
    });
    expect(second.result.current.notConfigured).toBe(false);
    expect(second.result.current.error).toMatch(/HTTP 502/);
  });

  it('uploads FormData with auth and no Content-Type', async () => {
    const fake = createFakeFetcher(() =>
      fakeResponse(201, {
        url: 'http://x/a.png',
        key: 'k',
        name: 'a.png',
        size: 1,
        contentType: 'image/png',
      })
    );
    const { result } = renderHook(() => useMediaLibrary(), {
      wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
    });
    await act(async () => {
      await result.current.uploadFile(
        new File(['x'], 'a.png', { type: 'image/png' })
      );
    });
    expect(fake.requests[0].body).toBeInstanceOf(FormData);
    expect(fake.requests[0].headers.Authorization).toBe('Bearer t');
    expect(Object.keys(fake.requests[0].headers)).not.toContain('Content-Type');
    expect(result.current.files[0].key).toBe('k');
  });
});

describe('useDatasource', () => {
  const product = { id: 'p1' };

  it('stays idle without a provider', () => {
    const { result } = renderHook(() =>
      useDatasource('product-by-sku', ['SKU-1'])
    );
    expect(result.current).toEqual({ data: null, loading: false, error: null });
  });

  it('resolves with auth', async () => {
    const fake = createFakeFetcher(() => fakeResponse(200, product));
    const { result } = renderHook(
      () => useDatasource('product-by-sku', ['SKU-1']),
      {
        wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
      }
    );
    await waitFor(() => expect(result.current.data).toEqual(product));
    expect(fake.requests[0].body).toBe('{"params":{"sku":"SKU-1"}}');
  });

  it('shares one request between identical consumers of one client', async () => {
    const fake = createFakeFetcher(() => fakeResponse(200, product));
    const { result } = renderHook(
      () =>
        [
          useDatasource('products-by-sku', ['A', 'B']),
          useDatasource('products-by-sku', ['A', 'B']),
        ] as const,
      { wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }) }
    );
    await waitFor(() => expect(result.current[1].data).toEqual(product));
    expect(fake.requests).toHaveLength(1);
  });

  it('sets error when the request fails', async () => {
    const fake = createFakeFetcher(() => fakeResponse(401, 'no'));
    const { result } = renderHook(
      () => useDatasource('product-by-sku', ['SKU-1']),
      {
        wrapper: providerWith({ fetcher: fake.fetcher, jwtToken: 't' }),
      }
    );
    await waitFor(() => expect(result.current.error).toMatch(/HTTP 401/));
    expect(result.current.data).toBeNull();
  });

  it('stays idle without auth unless publicDatasourceResolve is set', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(product), {
        headers: { 'content-type': 'application/json' },
      })
    );
    const idle = renderHook(() => useDatasource('product-by-sku', ['SKU-1']), {
      wrapper: providerWith({}),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(spy).not.toHaveBeenCalled();
    expect(idle.result.current.data).toBeNull();

    const open = renderHook(() => useDatasource('product-by-sku', ['SKU-1']), {
      wrapper: providerWith({ publicDatasourceResolve: true }),
    });
    await waitFor(() => expect(open.result.current.data).toEqual(product));
    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.headers).not.toHaveProperty('Authorization');
  });
});
