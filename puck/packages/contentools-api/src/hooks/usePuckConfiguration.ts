/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ThemeTokens } from '@commercetools-labs/contentools-types';
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
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [theme, setTheme] = useState<ThemeTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getThemeApi(client);
      setTheme(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // baseURL / businessUnitKey are not read by `fetchTheme` (the client is stable) but a change must refetch.
  useEffect(() => {
    void fetchTheme();
  }, [fetchTheme, baseURL, businessUnitKey]);

  const saveTheme = useCallback(
    async (value: ThemeTokens) => {
      setLoading(true);
      setError(null);
      try {
        const saved =
          theme === null
            ? await createThemeApi(client, value)
            : await updateThemeApi(client, value);
        setTheme(saved);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, theme]
  );

  const updateTheme = useCallback(
    async (value: ThemeTokens) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await updateThemeApi(client, value);
        setTheme(updated);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return {
    theme,
    loading,
    error,
    fetchTheme,
    saveTheme,
    updateTheme,
    clearError,
  };
};
