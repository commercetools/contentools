import { useEffect, useState } from 'react';
import { resolveDatasourceApi } from '../api/datasource.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UseDatasourceReturn {
  data: unknown;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves a datasource against the service backend and returns the result.
 *
 * @param type - The datasource key: 'product-by-sku' | 'products-by-sku'
 * @param skus - Array of SKU strings
 */
export const useDatasource = (
  type: string | undefined,
  skus: string[]
): UseDatasourceReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a stable string key so the effect only re-runs when values change
  const skusKey = skus.filter(Boolean).join(',');

  useEffect(() => {
    if (!type || !skusKey || !jwtToken) return;

    const params: Record<string, string> =
      type === 'product-by-sku'
        ? { sku: skus.filter(Boolean)[0] }
        : { skus: skusKey };

    setLoading(true);
    setError(null);

    resolveDatasourceApi(
      baseURL,
      projectKey,
      businessUnitKey,
      jwtToken,
      type,
      { params }
    )
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, skusKey, baseURL, projectKey, businessUnitKey, jwtToken]);

  return { data, loading, error };
};
