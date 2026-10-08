export default {
  id: 'type-b4c5d6e7-f8a9-4b7c-1d2e-3f4a5b6c7d8e',
  key: 'type-b4c5d6e7-f8a9-4b7c-1d2e-3f4a5b6c7d8e',
  metadata: {
    type: 'EmptyState',
    name: 'Empty State',
    icon: '📭',
    defaultProperties: {},
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
      description: {
        type: 'string',
        label: 'Description',
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
    componentName: 'EmptyState',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  text-align: center;
  padding: 3rem 1rem;
\`;
const StyledImage = styled.img\`
  max-width: 200px;
  height: auto;
  margin-bottom: 1.5rem;
  opacity: 0.8;
\`;
const Title = styled.h2\`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 0.5rem;
\`;
const Description = styled.p\`
  color: #666;
  margin-bottom: 1.5rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
\`;
const CTA = styled.a\`
  display: inline-block;
  background: #2c5530;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  &:hover { background: #1e3a21; }
\`;

function EmptyState({ image, title, description, ctaText, ctaLink }) {
  return (
    <Wrapper>
      {image?.url && <StyledImage src={image.url} alt={title || 'Empty state'} />}
      {title && <Title>{title}</Title>}
      {description && <Description>{description}</Description>}
      {ctaText && ctaLink && <CTA href={ctaLink}>{ctaText}</CTA>}
    </Wrapper>
  );
}
`,
  },
};
