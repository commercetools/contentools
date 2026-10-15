export default {
  id: 'type-d6e7f8a9-b0c1-4d9e-3f4a-5b6c7d8e9f0a',
  key: 'type-d6e7f8a9-b0c1-4d9e-3f4a-5b6c7d8e9f0a',
  metadata: {
    type: 'CrossSellBlock',
    name: 'Cross Sell Block',
    icon: '🛒',
    defaultProperties: {},
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 0,
      },
      products: {
        type: 'datasource',
        label: 'Products',
        required: false,
        order: 1,
        datasourceType: 'products-by-sku',
      },
      ctaText: {
        type: 'string',
        label: 'CTA text',
        required: false,
        order: 2,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'CrossSellBlock',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  padding: 2rem 0;
  border-top: 1px solid #eee;
\`;
const Title = styled.h3\`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
\`;
const Grid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
\`;
const Card = styled.a\`
  text-align: center;
  text-decoration: none;
  color: inherit;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
\`;
const ImgWrap = styled.div\`
  height: 120px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 4px;
\`;
const Img = styled.img\`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
\`;
const Name = styled.div\`
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
\`;
const Price = styled.div\`
  font-size: 1.1rem;
  color: #2c5530;
  font-weight: bold;
\`;
const CTA = styled.a\`
  display: inline-block;
  margin-top: 1rem;
  color: #2c5530;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
\`;

function CrossSellBlock({ title = 'Frequently bought together', products = [], ctaText }) {
  const safe = Array.isArray(products) ? products : [];
  const formatPrice = (c, ccy = 'USD') => typeof c === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy }).format(c / 100) : '';
  const getPrice = (p) => { const ps = p?.masterVariant?.prices || []; return ps[0] ? formatPrice(ps[0].value?.centAmount, ps[0].value?.currencyCode) : ''; };
  if (safe.length === 0) return null;
  return (
    <Wrapper>
      <Title>{title}</Title>
      <Grid>
        {safe.map((product, i) => {
          const name = product?.name?.['en-US'] || 'Product';
          const img = product?.masterVariant?.images?.[0];
          const link = product?.slug?.['en-US'] || product?.id || '#';
          return (
            <Card key={product?.id || i} href={link}>
              <ImgWrap>
                {img?.url ? <Img src={img.url} alt={name} /> : null}
              </ImgWrap>
              <Name>{name}</Name>
              <Price>{getPrice(product)}</Price>
            </Card>
          );
        })}
      </Grid>
      {ctaText && <CTA href="#">{ctaText}</CTA>}
    </Wrapper>
  );
}
`,
  },
};
