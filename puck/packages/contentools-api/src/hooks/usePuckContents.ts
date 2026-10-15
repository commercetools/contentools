import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckContentInput,
  PuckContentListItem,
  PuckContentResponse,
} from '@commercetools-labs/contentools-types';
import {
  createPuckContentApi,
  deletePuckContentApi,
  listPuckContentsApi,
} from '../api/puck-contents.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckContentsReturn {
  contents: PuckContentListItem[];
  loading: boolean;
  error: string | null;
  fetchContents: (contentType?: string) => Promise<void>;
  createContent: (
    input: CreatePuckContentInput
  ) => Promise<PuckContentResponse>;
  deleteContent: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePuckContents = (
  defaultContentType?: string
): UsePuckContentsReturn => {
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [contents, setContents] = useState<PuckContentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContentType, setLastContentType] = useState<string | undefined>(
    defaultContentType
  );

  const fetchContents = useCallback(
    async (contentType?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      setLastContentType(contentType);
      try {
        const data = await listPuckContentsApi(client, contentType);
        setContents(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchContents(lastContentType);
  }, [fetchContents, lastContentType]);

  // baseURL / businessUnitKey are not read by `fetchContents` (the client is stable) but a change must refetch.
  useEffect(() => {
    void fetchContents(defaultContentType);
  }, [fetchContents, defaultContentType, baseURL, businessUnitKey]);

  const createContent = useCallback(
    async (input: CreatePuckContentInput): Promise<PuckContentResponse> => {
      const created = await createPuckContentApi(client, { value: input });
      await refresh();
      return created;
    },
    [client, refresh]
  );

  const deleteContent = useCallback(
    async (key: string): Promise<void> => {
      await deletePuckContentApi(client, key);
      await refresh();
    },
    [client, refresh]
  );

  return {
    contents,
    loading,
    error,
    fetchContents,
    createContent,
    deleteContent,
    refresh,
  };
};
