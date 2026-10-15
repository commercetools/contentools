import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { createFakeFetcher } from '../client/fake-fetcher';
import {
  usePuckApiContext,
  usePuckApiContextOptional,
  type PuckApiContextValue,
} from './PuckApiContext';
import { PuckApiProvider } from './PuckApiProvider';

const base = {
  baseURL: 'http://svc.test/service',
  businessUnitKey: 'main-store',
};

describe('PuckApiProvider', () => {
  it('keeps the client identity across a token change and uses the new token', async () => {
    const fake = createFakeFetcher();
    let token = 'one';
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <PuckApiProvider {...base} fetcher={fake.fetcher} jwtToken={token}>
        {children}
      </PuckApiProvider>
    );
    const { result, rerender } = renderHook(() => usePuckApiContext(), {
      wrapper,
    });
    const first = result.current.client;
    await first.request('getPuckPageApi', '/a');

    token = 'two';
    rerender();
    expect(result.current.client).toBe(first);
    await result.current.client.request('getPuckPageApi', '/b');

    expect(fake.requests.map((r) => r.headers.Authorization)).toEqual([
      'Bearer one',
      'Bearer two',
    ]);
  });

  it('reports canAuthenticate and exposes the connection', () => {
    const fake = createFakeFetcher();
    const anonymous = renderHook(() => usePuckApiContext(), {
      wrapper: ({ children }) => (
        <PuckApiProvider {...base}>{children}</PuckApiProvider>
      ),
    });
    expect(anonymous.result.current.canAuthenticate).toBe(false);

    const withFetcher = renderHook(() => usePuckApiContext(), {
      wrapper: ({ children }) => (
        <PuckApiProvider {...base} fetcher={fake.fetcher}>
          {children}
        </PuckApiProvider>
      ),
    });
    expect(withFetcher.result.current.canAuthenticate).toBe(true);
    expect(withFetcher.result.current.connection.fetcher).toBe(fake.fetcher);
  });

  it('reuses the ancestor client for an identical nested provider and creates a new one otherwise', () => {
    const fake = createFakeFetcher();
    const seen: Record<string, PuckApiContextValue> = {};
    const Capture = ({ name }: { name: string }) => {
      seen[name] = usePuckApiContext();
      return null;
    };
    render(
      <PuckApiProvider {...base} fetcher={fake.fetcher}>
        <Capture name="outer" />
        <PuckApiProvider {...base} fetcher={fake.fetcher}>
          <Capture name="same" />
        </PuckApiProvider>
        <PuckApiProvider {...base} fetcher={fake.fetcher} jwtToken="other">
          <Capture name="different" />
        </PuckApiProvider>
      </PuckApiProvider>
    );
    expect(seen.same.client).toBe(seen.outer.client);
    expect(seen.different.client).not.toBe(seen.outer.client);
  });

  it('usePuckApiContextOptional returns null outside a provider', () => {
    const { result } = renderHook(() => usePuckApiContextOptional());
    expect(result.current).toBeNull();
  });
});
