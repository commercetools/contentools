export default {
  id: 'type-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  key: 'type-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  metadata: {
    type: 'PromotionalBanner',
    name: 'Promotional Banner',
    icon: '📢',
    defaultProperties: {
      background: '#f5f5f5',
    },
    propertySchema: {
      image: {
        type: 'file',
        label: 'Image',
        required: false,
        order: 0,
      },
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 1,
      },
      subtitle: {
        type: 'string',
        label: 'Subtitle',
        required: false,
        order: 2,
      },
      ctaText: {
        type: 'string',
        label: 'CTA text',
        required: false,
        order: 3,
      },
      ctaLink: {
        type: 'string',
        label: 'CTA Link',
        required: false,
        order: 4,
      },
      background: {
        type: 'string',
        label: 'Background Color',
        required: false,
        order: 5,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'PromotionalBanner',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const BannerContainer = styled.div\`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  background-color: \${props => props.background || '#f5f5f5'};
  padding: 2rem;
  border-radius: 2px;
  margin: 1rem 0;
  gap: 2rem;
  flex-wrap: wrap;
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
\`;
const ImageSection = styled.div\`
  flex: 0 0 auto;
  max-width: 40%;
  @media (max-width: 768px) {
    max-width: 100%;
  }
\`;
const StyledImage = styled.img\`
  max-width: 100%;
  height: auto;
  border-radius: 2px;
\`;
const ContentSection = styled.div\`
  flex: 1;
  min-width: 200px;
\`;
const Title = styled.h2\`
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
\`;
const Subtitle = styled.p\`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
\`;
const CTAButton = styled.a\`
  display: inline-block;
  background-color: #2c5530;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 2px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  &:hover {
    background-color: #1e3a21;
    transform: translateY(-2px);
  }
\`;

function PromotionalBanner({ image, title, subtitle, ctaText, ctaLink, background }) {
  return (
    <BannerContainer background={background}>
      {image?.url && (
        <ImageSection>
          <StyledImage src={image.url} alt={title || 'Promo'} />
        </ImageSection>
      )}
      <ContentSection>
        {title && <Title>{title}</Title>}
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        {ctaText && ctaLink && (
          <CTAButton href={ctaLink}>{ctaText}</CTAButton>
        )}
      </ContentSection>
    </BannerContainer>
  );
}
`,
  },
};
