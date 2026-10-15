import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { renderFAQAccordion } from './FAQAccordion';
import { renderCountdownBanner } from './CountdownBanner';
import { renderNewsletterSignup } from './NewsletterSignup';
import { renderWebsiteLogo } from './WebsiteLogo';
import { renderProductBanner } from './ProductBanner';
import { renderProductSlider } from './ProductSlider';
import { renderRelatedProductsSlider } from './RelatedProductsSlider';
import { renderCrossSellBlock } from './CrossSellBlock';
import { renderHeroBanner } from './HeroBanner';
import { renderTextBlock } from './TextBlock';
import { renderDivider } from './Divider';
import { renderProductTeaser } from '../ProductTeaser';

// The product blocks are given pre-resolved data and no provider: no network is used.

const wrap = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      {ui}
    </IntlProvider>
  );

const product = {
  id: 'prod-1',
  name: { en: 'Blue Shirt' },
  slug: { en: 'blue-shirt' },
  masterVariant: {
    sku: 'SKU-1',
    images: [{ url: 'https://example.com/shirt.png' }],
    prices: [{ value: { centAmount: 1999, currencyCode: 'USD', fractionDigits: 2 } }],
  },
};
const resolved = { type: 'products-by-sku' as const, skus: ['SKU-1'], resolvedData: [product] };
const single = { type: 'product-by-sku' as const, skus: ['SKU-1'], resolvedData: product };

describe('content blocks (smoke)', () => {
  it('FAQAccordion shows the configured questions and opens an answer', () => {
    wrap(
      <>
        {renderFAQAccordion({
          id: 'faq',
          question1: 'Q1', answer1: 'A1',
          question2: 'Q2', answer2: 'A2',
          question3: '', answer3: '',
          question4: '', answer4: '',
        } as never)}
      </>
    );
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Q1'));
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('CountdownBanner renders headline and call to action', () => {
    wrap(
      <>
        {renderCountdownBanner({
          id: 'c', headline: 'Big sale', subline: 'Soon', endDate: '2999-01-01T00:00:00Z',
          ctaText: 'Shop now', ctaLink: '/shop', background: '#000',
        } as never)}
      </>
    );
    expect(screen.getByText('Big sale')).toBeInTheDocument();
    expect(screen.getByText('Shop now')).toBeInTheDocument();
  });

  it('NewsletterSignup renders its title', () => {
    wrap(
      <>
        {renderNewsletterSignup({
          id: 'n', title: 'Stay in touch', subtitle: 'Weekly', ctaText: 'Join', placeholder: 'Email',
        } as never)}
      </>
    );
    expect(screen.getByText('Stay in touch')).toBeInTheDocument();
  });

  it('WebsiteLogo renders an image when a logo url is set', () => {
    wrap(<>{renderWebsiteLogo({ id: 'l', logo: 'https://example.com/logo.png', maxWidth: '100', maxHeight: '40' } as never)}</>);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('ProductBanner renders the pre-resolved product name', () => {
    wrap(
      <>
        {renderProductBanner({
          id: 'pb', title: 'Featured', description: 'd', ctaText: 'Buy', ctaLink: '/buy',
          product: single, productOnLeft: true, background: '#fff', linkWith: 'sku', baseUrl: '/p/',
        } as never)}
      </>
    );
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getAllByText('Blue Shirt')[0]).toBeInTheDocument();
  });

  it('ProductSlider renders pre-resolved products', () => {
    wrap(<>{renderProductSlider({ id: 'ps', title: 'Slider', subtitle: 's', products: resolved, linkWith: 'sku', baseUrl: '/p/' } as never)}</>);
    expect(screen.getByText('Slider')).toBeInTheDocument();
    expect(screen.getAllByText('Blue Shirt')[0]).toBeInTheDocument();
  });

  it('RelatedProductsSlider renders pre-resolved products', () => {
    wrap(<>{renderRelatedProductsSlider({ id: 'rp', title: 'Related', subtitle: 's', products: resolved, linkWith: 'sku', baseUrl: '/p/' } as never)}</>);
    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getAllByText('Blue Shirt')[0]).toBeInTheDocument();
  });

  it('CrossSellBlock links to the product by sku', () => {
    wrap(<>{renderCrossSellBlock({ id: 'cs', title: 'You may like', products: resolved, ctaText: 'View', linkWith: 'sku', baseUrl: '/p/' } as never)}</>);
    expect(screen.getByText('You may like')).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toContain('/p/SKU-1');
  });

  it('ProductTeaser renders the pre-resolved product', () => {
    wrap(<>{renderProductTeaser({ id: 'pt', datasource: single, richText: '<p>Teaser copy</p>', linkWith: 'sku', baseUrl: '/p/' } as never)}</>);
    expect(screen.getByAltText('Blue Shirt')).toBeInTheDocument();
  });

  it('HeroBanner renders the title', () => {
    wrap(<>{renderHeroBanner({ id: 'h', title: 'Welcome', subtitle: 'Hello', image: '' } as never)}</>);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('TextBlock renders sanitised html', () => {
    wrap(<>{renderTextBlock({ id: 't', content: '<p>Plain text</p>' } as never)}</>);
    expect(screen.getByText('Plain text')).toBeInTheDocument();
  });

  it('Divider renders a rule', () => {
    wrap(<>{renderDivider({ id: 'd', lineStyle: 'dashed', spacing: '16' } as never)}</>);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
