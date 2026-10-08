import { useCallback, useEffect, useState } from 'react';
import type { ThemeTokens } from '@commercetools-demo/puck-types';
import {
  createThemeApi,
  getThemeApi,
  updateThemeApi,
} from '../api/configuration.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckConfigurationReturn {
  theme: ThemeTokens | null;
  loading: boolean;
  error: string | null;
  fetchTheme: () => Promise<void>;
  saveTheme: (value: ThemeTokens) => Promise<void>;
  updateTheme: (value: ThemeTokens) => Promise<void>;
  clearError: () => void;
}

export const usePuckConfiguration = (): UsePuckConfigurationReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [theme, setTheme] = useState<ThemeTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getThemeApi(baseURL, projectKey, businessUnitKey);
      setTheme(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey]);

  useEffect(() => {
    void fetchTheme();
  }, [fetchTheme]);

  const saveTheme = useCallback(
    async (value: ThemeTokens) => {
      if (!jwtToken) throw new Error('jwtToken is required to save theme');
      setLoading(true);
      setError(null);
      try {
        const saved =
          theme === null
            ? await createThemeApi(baseURL, projectKey, jwtToken, businessUnitKey, value)
            : await updateThemeApi(baseURL, projectKey, jwtToken, businessUnitKey, value);
        setTheme(saved);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, theme]
  );

  const updateTheme = useCallback(
    async (value: ThemeTokens) => {
      if (!jwtToken) throw new Error('jwtToken is required to update theme');
      setLoading(true);
      setError(null);
      try {
        const updated = await updateThemeApi(
          baseURL,
          projectKey,
          jwtToken,
          businessUnitKey,
          value
        );
        setTheme(updated);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [baseURL, projectKey, jwtToken, businessUnitKey]
  );

  return { theme, loading, error, fetchTheme, saveTheme, updateTheme, clearError };
};
