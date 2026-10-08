import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckPageInput,
  PuckPageListItem,
  PuckPageResponse,
} from '@commercetools-demo/puck-types';
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
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [pages, setPages] = useState<PuckPageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPuckPagesApi(baseURL, projectKey, businessUnitKey);
      setPages(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPage = useCallback(
    async (input: CreatePuckPageInput): Promise<PuckPageResponse> => {
      if (!jwtToken) throw new Error('jwtToken is required to create a page');
      const created = await createPuckPageApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        { value: input }
      );
      await refresh();
      return created;
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, refresh]
  );

  const deletePage = useCallback(
    async (key: string): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to delete a page');
      await deletePuckPageApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        key
      );
      await refresh();
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, refresh]
  );

  return { pages, loading, error, refresh, createPage, deletePage };
};
