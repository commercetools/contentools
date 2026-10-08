import { httpClient, readHeaders } from './http-client';

/** Slim product shape returned by the service's product-search endpoint. */
export interface ProductSearchResult {
  id: string;
  name?: string;
  sku?: string;
  image?: string;
  slug?: string;
}

/**
 * Free-text product search (task #4). Backed by GET /products/search, which
 * proxies the commercetools Product Search API. Read-only — project-key auth.
 */
export const searchProductsApi = async (
  baseURL: string,
  projectKey: string,
  text: string,
  options: { limit?: number; locale?: string } = {}
): Promise<ProductSearchResult[]> => {
  const params = new URLSearchParams({ text });
  if (options.limit) params.set('limit', String(options.limit));
  if (options.locale) params.set('locale', options.locale);

  return httpClient<ProductSearchResult[]>(
    `${baseURL}/products/search?${params.toString()}`,
    { headers: readHeaders(projectKey) }
  );
};
