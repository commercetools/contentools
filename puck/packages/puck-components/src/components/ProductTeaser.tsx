import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';
import { useDatasource } from '@commercetools-demo/puck-api';
import { RichTextContent } from './RichTextContent';
import { resolveProductLink, type ProductLinkProps } from './cms/shared';
import type { DatasourceValue } from '../datasource.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductTeaserProps extends ProductLinkProps {
  datasource: DatasourceValue;
  richText: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ProductProjection {
  name?: Record<string, string>;
  masterVariant?: {
    images?: Array<{ url: string }>;
    prices?: Array<{
      value: { centAmount: number; currencyCode: string; fractionDigits: number };
    }>;
  };
}

const getLocalizedName = (name?: Record<string, string>): string => {
  if (!name) return '';
  return name['en'] ?? name['en-US'] ?? Object.values(name)[0] ?? '';
};

const formatPrice = (
  centAmount: number,
  currencyCode: string,
  fractionDigits: number
): string => {
  const amount = centAmount / Math.pow(10, fractionDigits);
  return `${currencyCode} ${amount.toFixed(fractionDigits)}`;
};

// ---------------------------------------------------------------------------
// Render — a proper React component so hooks work
// ---------------------------------------------------------------------------

export const renderProductTeaser: NonNullable<
  ComponentConfig<ProductTeaserProps>['render']
> = ({ datasource, richText, linkWith, baseUrl }) => {
  // Skip the hook fetch when the server has already pre-resolved the data.
  const hasPreResolved = datasource?.resolvedData != null;
  const { data: fetchedData, loading, error } = useDatasource(
    hasPreResolved ? undefined : datasource?.type,
    hasPreResolved ? [] : (datasource?.skus ?? [])
  );

  const data = hasPreResolved ? datasource.resolvedData : fetchedData;

  // For products-by-sku the service returns an array; for product-by-sku a single object.
  const product: ProductProjection | null = data
    ? Array.isArray(data)
      ? (data[0] as ProductProjection) ?? null
      : (data as ProductProjection)
    : null;

  const imageUrl = product?.masterVariant?.images?.[0]?.url;
  const priceValue = product?.masterVariant?.prices?.[0]?.value;
  const productName = getLocalizedName(product?.name);
  const href = product ? resolveProductLink(product, linkWith, baseUrl) : undefined;

  return (
    <div
      style={{
        display: 'flex',
        gap: '24px',
        padding: '16px',
        alignItems: 'flex-start',
        fontFamily: 'inherit',
      }}
    >
      {/* Left: product image */}
      <div style={{ flexShrink: 0, width: '200px' }}>
        {loading ? (
          <div
            style={{
              width: '200px',
              height: '200px',
              background: '#f3f4f6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            <FormattedMessage id="Editor.loading" />
          </div>
        ) : imageUrl ? (
          <a href={href} style={{ display: 'block' }}>
            <img
              src={imageUrl}
              alt={productName}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px',
                display: 'block',
              }}
            />
          </a>
        ) : (
          <div
            style={{
              width: '200px',
              height: '200px',
              background: '#f3f4f6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            {error ? (
              <FormattedMessage id="Editor.errorLoadingProduct" />
            ) : (
              <FormattedMessage id="Editor.noProductSelected" />
            )}
          </div>
        )}
      </div>

      {/* Right: rich text + price stacked */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {richText ? (
          <RichTextContent html={richText} />
        ) : (
          <div style={{ color: '#9ca3af', fontSize: '13px' }}>
            <FormattedMessage id="Editor.noDescription" />
          </div>
        )}

        {priceValue && (
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {formatPrice(
              priceValue.centAmount,
              priceValue.currencyCode,
              priceValue.fractionDigits
            )}
          </div>
        )}
      </div>
    </div>
  );
};
