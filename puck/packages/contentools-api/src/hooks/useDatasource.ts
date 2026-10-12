/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useEffect, useState } from 'react';
import { resolveDatasourceApi } from '../api/datasource.api';
import type { PuckClient } from '../client/client';
import { usePuckApiContextOptional } from '../context/PuckApiContext';

export interface UseDatasourceReturn {
  data: unknown;
  loading: boolean;
  error: string | null;
}

/** Identical in-flight requests of one client share a single promise. */
const inflight = new WeakMap<PuckClient, Map<string, Promise<unknown>>>();

const resolveOnce = (
  client: PuckClient,
  type: string,
  skusKey: string
): Promise<unknown> => {
  let perClient = inflight.get(client);
  if (!perClient) {
    perClient = new Map();
    inflight.set(client, perClient);
  }
  const key = `${type}:${skusKey}`;
  const existing = perClient.get(key);
  if (existing) return existing;

  const skus = skusKey.split(',');
  const params: Record<string, string> =
    type === 'product-by-sku' ? { sku: skus[0] } : { skus: skusKey };
  const pending = resolveDatasourceApi(client, type, { params });
  perClient.set(key, pending);
  // Entries live only while the request is in flight: results are never cached across mounts.
  const clear = () => {
    perClient.delete(key);
  };
  pending.then(clear, clear);
  return pending;
};

/**
 * Resolves a datasource against the service backend and returns the result.
 *
 * Works without any provider (returns no data). Without authentication the hook stays idle
 * unless the connection sets `publicDatasourceResolve`; published content normally embeds
 * `resolvedData`, so storefronts do not need this call.
 *
 * @param type - The datasource key: 'product-by-sku' | 'products-by-sku'
 * @param skus - Array of SKU strings
 */
export const useDatasource = (
  type: string | undefined,
  skus: string[]
): UseDatasourceReturn => {
  const ctx = usePuckApiContextOptional();
  const client = ctx?.client;

  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a stable string key so the effect only re-runs when values change
  const skusKey = skus.filter(Boolean).join(',');

  useEffect(() => {
    if (!client || !type || !skusKey) return;
    if (!client.canAuthenticate && !client.publicDatasourceResolve) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveOnce(client, type, skusKey)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, type, skusKey]);

  return { data, loading, error };
};
