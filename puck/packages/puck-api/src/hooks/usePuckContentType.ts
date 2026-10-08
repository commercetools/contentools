import { useCallback, useState } from 'react';
import type { ImportResult } from '@commercetools-demo/puck-types';
import { importDefaultContentTypesApi } from '../api/configuration.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckContentTypeReturn {
  loading: boolean;
  error: string | null;
  importDefaultContentTypes: () => Promise<ImportResult>;
  clearError: () => void;
}

export const usePuckContentType = (): UsePuckContentTypeReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const importDefaultContentTypes = useCallback(async (): Promise<ImportResult> => {
    if (!jwtToken) throw new Error('jwtToken is required to import content types');
    setLoading(true);
    setError(null);
    try {
      return await importDefaultContentTypesApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, jwtToken, businessUnitKey]);

  return { loading, error, importDefaultContentTypes, clearError };
};
