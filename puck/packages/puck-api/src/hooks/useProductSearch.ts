import { useEffect, useState } from 'react';
import { searchProductsApi, type ProductSearchResult } from '../api/products.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UseProductSearchReturn {
  results: ProductSearchResult[];
  loading: boolean;
  error: string | null;
}

/**
 * Debounced free-text product search for the product-selection picker (task #4).
 *
 * @param query  - The search text. Empty/whitespace yields no results.
 * @param locale - Optional locale override. Defaults to the PuckApiProvider's
 *                 `locale`, then "en-US", for the full-text match + localized fields.
 */
export const useProductSearch = (
  query: string,
  locale?: string
): UseProductSearchReturn => {
  const { baseURL, projectKey, locale: contextLocale } = usePuckApiContext();
  const effectiveLocale = locale ?? contextLocale ?? 'en-US';

  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const term = query.trim();

  useEffect(() => {
    if (!term) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const handle = setTimeout(() => {
      searchProductsApi(baseURL, projectKey, term, { limit: 20, locale: effectiveLocale })
        .then((res) => {
          if (cancelled) return;
          setResults(res ?? []);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term, baseURL, projectKey, effectiveLocale]);

  return { results, loading, error };
};
