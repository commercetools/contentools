export default {
  id: 'type-e3f4a5b6-c7d8-4e6f-0a1b-2c3d4e5f6a7b',
  key: 'type-e3f4a5b6-c7d8-4e6f-0a1b-2c3d4e5f6a7b',
  metadata: {
    type: 'ThankYouContent',
    name: 'Thank You Content',
    icon: '✅',
    defaultProperties: {},
    propertySchema: {
      headline: {
        type: 'string',
        label: 'Headline',
        required: false,
        order: 0,
      },
      message: {
        type: 'richText',
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
    componentName: 'ThankYouContent',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  text-align: center;
  padding: 3rem 1rem;
  max-width: 560px;
  margin: 0 auto;
\`;
const Headline = styled.h1\`
  font-size: 2rem;
  color: #2c5530;
  margin-bottom: 1rem;
\`;
const Message = styled.div\`
  font-size: 1rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 2rem;
  p { margin-bottom: 0.75rem; }
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

function ThankYouContent({ headline = 'Thank you for your order!', message, ctaText, ctaLink }) {
  return (
    <Wrapper>
      {headline && <Headline>{headline}</Headline>}
      {message && <Message dangerouslySetInnerHTML={{ __html: message }} />}
      {ctaText && ctaLink && <CTA href={ctaLink}>{ctaText}</CTA>}
    </Wrapper>
  );
}
`,
  },
};
