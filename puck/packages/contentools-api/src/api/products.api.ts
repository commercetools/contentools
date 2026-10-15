import type { PuckClient } from '../client/client';

/** Slim product shape returned by the service's product-search endpoint. */
export interface ProductSearchResult {
  id: string;
  name?: string;
  sku?: string;
  image?: string;
  slug?: string;
}

/**
 * Free-text product search. Backed by GET /products/search, which proxies the
 * commercetools Product Search API. Editor-only: requires authentication.
 */
export const searchProductsApi = (
  client: PuckClient,
  text: string,
  options: { limit?: number; locale?: string } = {}
) =>
  client.request<ProductSearchResult[]>(
    'searchProductsApi',
    '/products/search',
    {
      query: {
        text,
        limit: options.limit || undefined,
        locale: options.locale || undefined,
      },
    }
  );
