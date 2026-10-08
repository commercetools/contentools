// Shared RENDER helpers used across CMS Puck components (Nimbus-free).
// The editor-side field factory (createProductLinkFields) lives in
// puck-editor's own cms/shared.ts, which re-exports the data/types from here.

export const getLocalizedText = (obj?: Record<string, string> | null): string => {
  if (!obj) return '';
  return obj['en-US'] ?? obj['en'] ?? Object.values(obj)[0] ?? '';
};

export const formatPrice = (
  centAmount: number,
  currencyCode = 'USD',
  fractionDigits = 2
): string => {
  const amount = centAmount / Math.pow(10, fractionDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

export const getFirstPrice = (
  product: unknown
): { centAmount: number; currencyCode: string; fractionDigits: number } | null => {
  const p = product as any;
  return p?.masterVariant?.prices?.[0]?.value ?? null;
};

export const getProductImage = (product: unknown): string | null => {
  const p = product as any;
  return p?.masterVariant?.images?.[0]?.url ?? null;
};

export const getProductName = (product: unknown): string => {
  const p = product as any;
  return getLocalizedText(p?.name) || 'Product';
};

export const getProductSlug = (product: unknown): string => {
  const p = product as any;
  return getLocalizedText(p?.slug) || p?.id || '#';
};

export const getProductSku = (product: unknown): string => {
  const p = product as any;
  return p?.masterVariant?.sku ?? '';
};

/** How a product link is built — from the product slug or its SKU. */
export type ProductLinkWith = 'slug' | 'sku';

/**
 * Build a storefront link to a product.
 *
 * Joins a sanitised base URL with the product's slug or SKU. The base is
 * trimmed, stripped of leading/trailing slashes and collapsed of any double
 * slashes, then re-prefixed with a single "/", e.g.
 *   resolveProductLink(p, 'sku',  '/product/') → '/product/123'   (sku 123)
 *   resolveProductLink(p, 'slug', '/slug/p/')  → '/slug/p/test'   (slug "test")
 */
export const resolveProductLink = (
  product: unknown,
  linkWith: ProductLinkWith = 'sku',
  baseUrl = '/p/'
): string => {
  const p = product as any;
  const slug = getLocalizedText(p?.slug);
  const sku = getProductSku(product);
  const id = (p?.id as string) ?? '';
  // Chosen identifier, falling back to the product id / the other identifier.
  const identifier = (linkWith === 'sku' ? sku : slug) || id || slug || sku;

  const base =
    '/' +
    String(baseUrl ?? '')
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/{2,}/g, '/');
  const cleanId = String(identifier ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  return (cleanId ? `${base}/${cleanId}` : base).replace(/\/{2,}/g, '/');
};

/** Props every product-linking component shares. */
export interface ProductLinkProps {
  linkWith: ProductLinkWith;
  baseUrl: string;
}

/** Default values for the shared link props — spread into a component's defaultProps. */
export const productLinkDefaults: ProductLinkProps = {
  linkWith: 'sku',
  baseUrl: '/p/',
};

// Colour palette shared across components
export const colors = {
  primary: '#2c5530',
  primaryHover: '#1e3a21',
  lightBg: '#f0f7f0',
  lightBorder: '#c8e6c8',
  text: '#333',
  textMuted: '#666',
  border: '#eee',
  bg: '#f5f5f5',
};
