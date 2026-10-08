import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';
import { useDatasource } from '@commercetools-demo/puck-api';
import {
  formatPrice,
  getFirstPrice,
  getLocalizedText,
  getProductImage,
  resolveProductLink,
  type ProductLinkProps,
} from './shared';
import type { DatasourceValue } from '../../datasource.types';

export interface CrossSellBlockProps extends ProductLinkProps {
  title: string;
  products: DatasourceValue;
  ctaText: string;
}

export const renderCrossSellBlock: NonNullable<
  ComponentConfig<CrossSellBlockProps>['render']
> = ({ title, products, ctaText, linkWith, baseUrl }) => {
  const hasPreResolved = products?.resolvedData != null;
  const { data: fetchedData, loading } = useDatasource(
    hasPreResolved ? undefined : products?.type,
    hasPreResolved ? [] : (products?.skus ?? [])
  );
  const items: unknown[] = hasPreResolved
    ? (Array.isArray(products.resolvedData) ? products.resolvedData : [])
    : (Array.isArray(fetchedData) ? fetchedData : []);

  if (!loading && items.length === 0) return <></>;

  return (
    <div style={{ padding: '2rem 0', borderTop: '1px solid #eee' }}>
      {title && <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#333' }}>{title || 'Frequently bought together'}</h3>}
      {loading && <div style={{ color: '#999', padding: '1rem' }}><FormattedMessage id="Editor.loading" /></div>}
      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {items.map((product, i) => {
            const name = getLocalizedText((product as any)?.name);
            const imageUrl = getProductImage(product);
            const priceVal = getFirstPrice(product);
            return (
              <a
                key={(product as any)?.id ?? i}
                href={resolveProductLink(product, linkWith, baseUrl)}
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #eee',
                }}
              >
                <div style={{ height: '120px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: '4px' }}>
                  {imageUrl
                    ? <img src={imageUrl} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : null
                  }
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{name}</div>
                {priceVal && (
                  <div style={{ fontSize: '1.1rem', color: '#2c5530', fontWeight: 'bold' }}>
                    {formatPrice(priceVal.centAmount, priceVal.currencyCode, priceVal.fractionDigits)}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
      {ctaText && (
        <a href="#" style={{ display: 'inline-block', marginTop: '1rem', color: '#2c5530', fontWeight: 600, textDecoration: 'none' }}>
          {ctaText}
        </a>
      )}
    </div>
  );
};
