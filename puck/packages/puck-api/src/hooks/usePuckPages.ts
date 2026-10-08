/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckPageInput,
  PuckPageListItem,
  PuckPageResponse,
} from '@commercetools-labs/puck-types';
import {
  createPuckPageApi,
  deletePuckPageApi,
  listPuckPagesApi,
} from '../api/puck-pages.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckPagesReturn {
  pages: PuckPageListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPage: (input: CreatePuckPageInput) => Promise<PuckPageResponse>;
  deletePage: (key: string) => Promise<void>;
}

export const usePuckPages = (): UsePuckPagesReturn => {
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [pages, setPages] = useState<PuckPageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPuckPagesApi(client);
      setPages(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // baseURL / businessUnitKey are not read by `refresh` (the client is stable) but a change must refetch.
  useEffect(() => {
    void refresh();
  }, [refresh, baseURL, businessUnitKey]);

  const createPage = useCallback(
    async (input: CreatePuckPageInput): Promise<PuckPageResponse> => {
      const created = await createPuckPageApi(client, { value: input });
      await refresh();
      return created;
    },
    [client, refresh]
  );

  const deletePage = useCallback(
    async (key: string): Promise<void> => {
      await deletePuckPageApi(client, key);
      await refresh();
    },
    [client, refresh]
  );

  return { pages, loading, error, refresh, createPage, deletePage };
};
