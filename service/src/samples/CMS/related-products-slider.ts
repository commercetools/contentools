export default {
  id: 'type-c5d6e7f8-a9b0-4c8d-2e3f-4a5b6c7d8e9f',
  key: 'type-c5d6e7f8-a9b0-4c8d-2e3f-4a5b6c7d8e9f',
  metadata: {
    type: 'RelatedProductsSlider',
    name: 'Related Products Slider',
    icon: '🔄',
    defaultProperties: {
      title: 'Related Products',
    },
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 0,
      },
      subtitle: {
        type: 'string',
        label: 'Subtitle',
        required: false,
        order: 1,
      },
      products: {
        type: 'datasource',
        label: 'Products',
        required: false,
        order: 2,
        datasourceType: 'products-by-sku',
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'ProductSlider',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const SliderContainer = styled.div\`
  width: 100%;
  padding: 2rem 0;
  overflow-x: auto;
  display: flex;
  gap: 1rem;
  scroll-snap-type: x mandatory;
\`;
const Header = styled.div\`
  text-align: center;
  margin-bottom: 2rem;
\`;
const Title = styled.h2\`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
\`;
const Subtitle = styled.p\`
  font-size: 1.1rem;
  color: #666;
  margin: 0;
\`;
const ProductCard = styled.a\`
  flex: 0 0 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  scroll-snap-align: start;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
\`;
const ProductImage = styled.div\`
  width: 100%;
  height: 200px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
\`;
const Img = styled.img\`
  width: 100%;
  height: 100%;
  object-fit: contain;
\`;
const ProductInfo = styled.div\`
  padding: 1.5rem;
\`;
const ProductName = styled.h3\`
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
\`;
const ProductPrice = styled.div\`
  font-size: 1.3rem;
  font-weight: bold;
  color: #2c5530;
\`;

function ProductSlider({ title = 'Related Products', subtitle = '', products = [] }) {
  const safeProducts = Array.isArray(products) ? products : [];
  const formatPrice = (centAmount, currencyCode = 'USD') => {
    if (typeof centAmount !== 'number') return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(centAmount / 100);
  };
  const getPrice = (product) => {
    const prices = product?.masterVariant?.prices || [];
    if (prices.length === 0) return '';
    const p = prices[0];
    return formatPrice(p?.value?.centAmount, p?.value?.currencyCode);
  };
  if (safeProducts.length === 0) return null;
  return (
    <SliderContainer>
      {(title || subtitle) && (
        <Header style={{ width: '100%' }}>
          {title && <Title>{title}</Title>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </Header>
      )}
      {safeProducts.map((product, index) => {
        const name = product?.name?.['en-US'] || 'Unnamed Product';
        const images = product?.masterVariant?.images || [];
        const primaryImage = images[0];
        const price = getPrice(product);
        const slug = product?.slug?.['en-US'] || product?.id || '#';
        return (
          <ProductCard key={product?.id || index} href={slug}>
            <ProductImage>
              {primaryImage?.url ? <Img src={primaryImage.url} alt={name} /> : <span style={{ color: '#999' }}>No image</span>}
            </ProductImage>
            <ProductInfo>
              <ProductName>{name}</ProductName>
              {price && <ProductPrice>{price}</ProductPrice>}
            </ProductInfo>
          </ProductCard>
        );
      })}
    </SliderContainer>
  );
}
`,
  },
};
