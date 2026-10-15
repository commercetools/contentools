import type {
  LocalizedString,
  ProductProjection,
  _SearchQueryExpression,
} from '@commercetools/platform-sdk';
import CustomError from '../errors/custom.error';
import { searchProductProjections } from '../services/products';
import { getLogger } from '../utils/logger.utils';

export const MAX_DATASOURCE_SKUS = 25;

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
  if (!value) {
    return undefined;
  }
  return (
    value[locale] ?? value[locale.split('-')[0] ?? ''] ?? Object.values(value)[0]
  );
};

/** Free-text product search for the editor's product picker. */
export async function searchProductsController(
  text: string,
  limit = 20,
  locale = 'en-US'
): Promise<ProductSearchResult[]> {
  const term = (text ?? '').trim();
  if (!term) {
    return [];
  }

  // "Contains" match; wildcards the user typed are dropped so they cannot inject their own.
  const wildcardValue = `*${term.replace(/[*?]/g, '')}*`;
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

  const response = await searchProductProjections({
    query: { or: clauses },
    limit,
    productProjectionParameters: {},
  });

  return (response.results ?? []).flatMap((result) => {
    const product = result.productProjection;
    if (!product) {
      return [];
    }
    const variant =
      product.masterVariant?.sku != null
        ? product.masterVariant
        : (product.variants?.find((v) => v.sku != null) ??
          product.masterVariant);
    return [
      {
        id: product.id,
        name: pickLocalized(product.name, locale),
        sku: variant?.sku,
        image: variant?.images?.[0]?.url,
        slug: pickLocalized(product.slug, locale),
      },
    ];
  });
}

export async function getProductBySku(
  sku: string
): Promise<ProductProjection | undefined> {
  if (!sku) {
    throw new CustomError(400, 'Product SKU is required');
  }
  try {
    const response = await searchProductProjections({
      query: { exact: { field: 'variants.sku', value: sku } },
      productProjectionParameters: {},
    });
    return response.results?.[0]?.productProjection;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    getLogger().error('product by SKU lookup failed');
    throw new CustomError(500, 'Failed to fetch product by SKU');
  }
}

export async function getProductsBySku(
  skus: string
): Promise<Array<ProductProjection | undefined>> {
  const list = skus
    .split(',')
    .map((sku) => sku.trim())
    .filter(Boolean);
  if (list.length === 0) {
    throw new CustomError(400, 'SKUs are required');
  }
  if (list.length > MAX_DATASOURCE_SKUS) {
    throw new CustomError(400, `Too many SKUs (max ${MAX_DATASOURCE_SKUS})`);
  }
  return Promise.all(list.map((sku) => getProductBySku(sku)));
}
