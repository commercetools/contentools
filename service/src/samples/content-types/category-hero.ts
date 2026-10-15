export default {
  id: 'type-f2a3b4c5-d6e7-4f5a-9b0c-1d2e3f4a5b6c',
  key: 'type-f2a3b4c5-d6e7-4f5a-9b0c-1d2e3f4a5b6c',
  metadata: {
    type: 'CategoryHero',
    name: 'Category Hero',
    icon: '🏷️',
    defaultProperties: {},
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
      image: {
        type: 'file',
        label: 'Image',
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
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'CategoryHero',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  position: relative;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
\`;
const BgImage = styled.img\`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
\`;
const Overlay = styled.div\`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.25);
\`;
const Content = styled.div\`
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 2rem;
  color: white;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
\`;
const Title = styled.h1\`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  @media (max-width: 768px) { font-size: 1.75rem; }
\`;
const Subtitle = styled.p\`
  font-size: 1.1rem;
  margin-bottom: 1rem;
\`;
const CTA = styled.a\`
  display: inline-block;
  background: white;
  color: #2c5530;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  &:hover { opacity: 0.9; }
\`;

function CategoryHero({ title, subtitle, image, ctaText, ctaLink }) {
  return (
    <Wrapper>
      {image?.url && <BgImage src={image.url} alt={title || 'Category'} />}
      <Overlay />
      <Content>
        {title && <Title>{title}</Title>}
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        {ctaText && ctaLink && <CTA href={ctaLink}>{ctaText}</CTA>}
      </Content>
    </Wrapper>
  );
}
`,
  },
};
