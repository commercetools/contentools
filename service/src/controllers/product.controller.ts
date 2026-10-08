import {
  LocalizedString,
  _SearchQueryExpression,
} from '@commercetools/platform-sdk';
import { searchProducts } from '../services/products';
import { logger } from '../utils/logger.utils';
import CustomError from '../errors/custom.error';
import { AuthenticatedRequest } from '../types/service.types';

/** Slim product shape returned to the editor's product-search picker. */
export interface ProductSearchResult {
  id: string;
  name?: string;
  sku?: string;
  image?: string;
  slug?: string;
}

const pickLocalized = (
  value: LocalizedString | undefined,
  locale: string
): string | undefined => {
  if (!value) return undefined;
  return (
    value[locale] ?? value[locale.split('-')[0]] ?? Object.values(value)[0]
  );
};

/**
 * Free-text product search for the editor's product-selection picker (task #4).
 * Returns a slim, picker-friendly shape rather than full ProductProjections.
 */
export const searchProductsController = async (
  req: AuthenticatedRequest,
  text: string,
  limit = 20,
  locale = 'en-US'
): Promise<ProductSearchResult[]> => {
  const term = (text ?? '').trim();
  if (!term) return [];

  // "Contains" match: wrap the term in wildcards so partial input matches, and
  // drop any `*`/`?` the user typed so they can't inject their own wildcards.
  const wildcardValue = `*${term.replace(/[*?]/g, '')}*`;

  // Match on name OR description (both localized text — need a `language`) OR
  // the variant SKU (a keyword field — not localized, so no `language`). Built
  // as a typed array because `SearchOrExpression.or` is `SearchQuery[]` (an
  // empty base type), which would reject inline expression literals.
  const clauses: _SearchQueryExpression[] = [
    {
      wildcard: {
        field: 'name',
        language: locale,
        value: wildcardValue,
        caseInsensitive: true,
      },
    },
    {
      wildcard: {
        field: 'description',
        language: locale,
        value: wildcardValue,
        caseInsensitive: true,
      },
    },
    {
      wildcard: {
        field: 'variants.sku',
        value: wildcardValue,
        caseInsensitive: true,
      },
    },
  ];

  const response = await searchProducts(req, {
    query: { or: clauses },
    limit,
    productProjectionParameters: {},
  });

  return (response.results ?? [])
    .map((result) => {
      const product = result.productProjection;
      if (!product) return undefined;
      const variant =
        product.masterVariant?.sku != null
          ? product.masterVariant
          : product.variants?.find((v) => v.sku != null) ??
            product.masterVariant;
      return {
        id: product.id,
        name: pickLocalized(product.name, locale),
        sku: variant?.sku,
        image: variant?.images?.[0]?.url,
        slug: pickLocalized(product.slug, locale),
      } as ProductSearchResult;
    })
    .filter((p): p is ProductSearchResult => !!p);
};

export const getProductBySkuController = async (
  req: AuthenticatedRequest,
  sku: string
) => {
  try {
    logger.info('Searching product by SKU:', sku);

    if (!sku) {
      throw new CustomError(400, 'Product SKU is required');
    }

    const product = await searchProducts(req, {
      query: {
        exact: {
          field: 'variants.sku',
          value: sku,
        },
      },
      productProjectionParameters: {},
    });
    return product.results?.[0]?.productProjection;
  } catch (error) {
    logger.error('Controller error fetching product by SKU:', error);
    throw new CustomError(500, 'Failed to fetch product by SKU');
  }
};

export const getProductsBySkuController = async (
  req: AuthenticatedRequest,
  skus: string
) => {
  try {
    logger.info('Searching products by SKUs:', skus);

    const skusArray = skus.split(',').map((sku) => sku.trim());

    if (!skusArray || skusArray.length === 0) {
      throw new CustomError(400, 'SKUs are required');
    }

    const products = await Promise.all(
      skusArray.map((sku) => getProductBySkuController(req, sku))
    );
    return products;
  } catch (error) {
    logger.error('Controller error fetching products by SKUs:', error);
    throw new CustomError(500, 'Failed to fetch products by SKUs');
  }
};
