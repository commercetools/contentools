export default {
  id: 'type-d37ba72e-ecde-4282-af05-ebee3c3635a5',
  key: 'type-d37ba72e-ecde-4282-af05-ebee3c3635a5',
  metadata: {
    type: 'ProductBanner',
    name: 'Product Banner',
    icon: '📸',
    defaultProperties: {
      background: '#969696',
    },
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 0,
      },
      ctaText: {
        type: 'string',
        label: 'CTA text',
        required: false,
        order: 2,
      },
      ctaLink: {
        type: 'string',
        label: 'CTA Link',
        required: false,
        order: 3,
      },
      product: {
        type: 'datasource',
        label: 'Product SKU',
        required: false,
        order: 4,
        datasourceType: 'product-by-sku',
      },
      productOnLeft: {
        type: 'boolean',
        label: 'Place product on left',
        required: false,
        order: 5,
      },
      background: {
        type: 'string',
        label: 'Background Color',
        required: false,
        order: 6,
      },
      description: {
        type: 'richText',
        label: 'Description',
        required: false,
        order: 7,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'ProductBanner',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const BannerContainer = styled.div\`
  display: flex;
  align-items: center;
  min-height: 400px;
  background-color: \${props => props.background || '#f5f5f5'};
  padding: 2rem;
  border-radius: 2px;
  margin: 1rem 0;
  flex-direction: \${props => props.productOnLeft ? 'row-reverse' : 'row'};
  gap: 2rem;
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
\`;
const ContentSection = styled.div\`
  flex: 1;
  padding: 1rem;
\`;
const ProductSection = styled.div\`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
\`;
const Title = styled.h2\`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #333;
  line-height: 1.2;
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
\`;
const ProductName = styled.h3\`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #444;
  text-align: center;
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
\`;
const ProductDescription = styled.p\`
  font-size: 0.9rem;
  color: #666;
  text-align: center;
  margin-bottom: 1rem;
  font-style: italic;
\`;
const Description = styled.div\`
  margin-bottom: 2rem;
  color: #555;
  line-height: 1.6;
  ul { padding-left: 1.5rem; margin: 1rem 0; }
  li { margin-bottom: 0.5rem; }
  p { margin-bottom: 1rem; }
\`;
const ProductImage = styled.img\`
  max-width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
\`;
const PriceContainer = styled.div\`
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
\`;
const Price = styled.span\`
  font-size: 1.25rem;
  font-weight: bold;
  color: #2c5530;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 2px;
\`;
const SKU = styled.span\`
  font-size: 0.85rem;
  color: #666;
  background-color: rgba(255, 255, 255, 0.6);
  padding: 0.25rem 0.75rem;
  border-radius: 2px;
\`;
const CTAButton = styled.a\`
  display: inline-block;
  background-color: #2c5530;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 2px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  text-align: center;
  &:hover {
    background-color: #1e3a21;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(44, 85, 48, 0.3);
  }
\`;

function ProductBanner({
  title = '',
  ctaText = '',
  ctaLink = '',
  product = {},
  productOnLeft = false,
  background = '#f5f5f5',
  description = '',
}) {
  const productName = product?.name?.['en-US'] || '';
  const productDesc = product?.description?.['en-US'] || '';
  const productImages = product?.masterVariant?.images || [];
  const productPrices = product?.masterVariant?.prices || [];
  const productSku = product?.masterVariant?.sku || '';
  const primaryImage = productImages.length > 0 ? productImages[0] : null;
  const formatPrice = (centAmount, currencyCode = 'USD') => {
    if (typeof centAmount !== 'number') return '';
    const amount = centAmount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  return (
    <BannerContainer background={background} productOnLeft={productOnLeft}>
      <ContentSection>
        {title && <Title>{title}</Title>}
        {description && (
          <Description dangerouslySetInnerHTML={{ __html: description }} />
        )}
        {ctaText && ctaLink && (
          <CTAButton href={ctaLink}>{ctaText}</CTAButton>
        )}
      </ContentSection>
      <ProductSection>
        {productName && <ProductName>{productName}</ProductName>}
        {productDesc && <ProductDescription>{productDesc}</ProductDescription>}
        {primaryImage && (
          <ProductImage
            src={primaryImage.url}
            alt={productName || 'Product image'}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        {productPrices.length > 0 && (
          <PriceContainer>
            {productPrices.slice(0, 2).map((price, index) => (
              <Price key={price.id || index}>
                {formatPrice(price.value?.centAmount, price.value?.currencyCode)}
              </Price>
            ))}
          </PriceContainer>
        )}
        {productSku && <SKU>SKU: {productSku}</SKU>}
      </ProductSection>
    </BannerContainer>
  );
}
`,
  },
};
