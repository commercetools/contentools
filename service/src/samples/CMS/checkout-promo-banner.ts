export default {
  id: 'type-d2e3f4a5-b6c7-4d5e-9f0a-1b2c3d4e5f6a',
  key: 'type-d2e3f4a5-b6c7-4d5e-9f0a-1b2c3d4e5f6a',
  metadata: {
    type: 'CheckoutPromoBanner',
    name: 'Checkout Promo Banner',
    icon: '🏷️',
    defaultProperties: {},
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 0,
      },
      message: {
        type: 'string',
        label: 'Message',
        required: false,
        order: 1,
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
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'CheckoutPromoBanner',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  padding: 1rem 1.25rem;
  background: #f0f7f0;
  border: 1px solid #c8e6c8;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
\`;
const Title = styled.div\`
  font-weight: 600;
  color: #2c5530;
  margin-bottom: 0.25rem;
\`;
const Message = styled.p\`
  margin: 0 0 0.5rem 0;
  color: #333;
\`;
const CTA = styled.a\`
  color: #2c5530;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
\`;

function CheckoutPromoBanner({ title, message, ctaText, ctaLink }) {
  if (!title && !message && !ctaText) return null;
  return (
    <Wrapper>
      {title && <Title>{title}</Title>}
      {message && <Message>{message}</Message>}
      {ctaText && ctaLink && <CTA href={ctaLink}>{ctaText}</CTA>}
    </Wrapper>
  );
}
`,
  },
};
