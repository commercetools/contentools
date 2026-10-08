/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useState } from 'react';
import type { ImportResult } from '@commercetools-labs/puck-types';
import { importDefaultContentTypesApi } from '../api/configuration.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckContentTypeReturn {
  loading: boolean;
  error: string | null;
  importDefaultContentTypes: () => Promise<ImportResult>;
  clearError: () => void;
}

export const usePuckContentType = (): UsePuckContentTypeReturn => {
  const { client } = usePuckApiContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const importDefaultContentTypes =
    useCallback(async (): Promise<ImportResult> => {
      setLoading(true);
      setError(null);
      try {
        return await importDefaultContentTypesApi(client);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, [client]);

  return { loading, error, importDefaultContentTypes, clearError };
};
