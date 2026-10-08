import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckContentInput,
  PuckContentListItem,
  PuckContentResponse,
} from '@commercetools-demo/puck-types';
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
  createContent: (input: CreatePuckContentInput) => Promise<PuckContentResponse>;
  deleteContent: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePuckContents = (
  defaultContentType?: string
): UsePuckContentsReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

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
        const data = await listPuckContentsApi(
          baseURL,
          projectKey,
          businessUnitKey,
          contentType
        );
        setContents(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [baseURL, projectKey, businessUnitKey]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchContents(lastContentType);
  }, [fetchContents, lastContentType]);

  useEffect(() => {
    void fetchContents(defaultContentType);
  }, [fetchContents, defaultContentType]);

  const createContent = useCallback(
    async (input: CreatePuckContentInput): Promise<PuckContentResponse> => {
      if (!jwtToken) throw new Error('jwtToken is required to create content');
      const created = await createPuckContentApi(
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

  const deleteContent = useCallback(
    async (key: string): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to delete content');
      await deletePuckContentApi(
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
