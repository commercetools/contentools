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

export interface ProductSliderProps extends ProductLinkProps {
  title: string;
  subtitle: string;
  products: DatasourceValue;
}

export const renderProductSlider: NonNullable<
  ComponentConfig<ProductSliderProps>['render']
> = ({ title, subtitle, products, linkWith, baseUrl }) => {
  const hasPreResolved = products?.resolvedData != null;
  const { data: fetchedData, loading } = useDatasource(
    hasPreResolved ? undefined : products?.type,
    hasPreResolved ? [] : (products?.skus ?? [])
  );
  const items: unknown[] = hasPreResolved
    ? (Array.isArray(products.resolvedData) ? products.resolvedData : [])
    : (Array.isArray(fetchedData) ? fetchedData : []);

  return (
    <div style={{ padding: '2rem 0' }}>
      {(title || subtitle) && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {title && <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>{title}</h2>}
          {subtitle && <p style={{ fontSize: '1.1rem', color: '#666', margin: 0 }}>{subtitle}</p>}
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}><FormattedMessage id="Editor.loadingProducts" /></div>}
      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem', fontSize: '13px' }}><FormattedMessage id="Editor.noProductsConfigured" /></div>
      )}
      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: '1rem',
          }}
        >
          {items.map((product, i) => {
            const name = getLocalizedText((product as any)?.name);
            const desc = getLocalizedText((product as any)?.description);
            const imageUrl = getProductImage(product);
            const priceVal = getFirstPrice(product);
            return (
              <a
                key={(product as any)?.id ?? i}
                href={resolveProductLink(product, linkWith, baseUrl)}
                style={{
                  flex: '0 0 280px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  scrollSnapAlign: 'start',
                }}
              >
                <div style={{ width: '100%', height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imageUrl
                    ? <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ color: '#999', fontSize: '0.85rem' }}><FormattedMessage id="Editor.noImage" /></span>
                  }
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem', lineHeight: 1.3 }}>{name}</h3>
                  {desc && (
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {desc}
                    </p>
                  )}
                  {priceVal && (
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2c5530' }}>
                      {formatPrice(priceVal.centAmount, priceVal.currencyCode, priceVal.fractionDigits)}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
