export default {
  id: 'type-d0e1f2a3-b4c5-4d3e-7f8a-9b0c1d2e3f4a',
  key: 'type-d0e1f2a3-b4c5-4d3e-7f8a-9b0c1d2e3f4a',
  metadata: {
    type: 'NewsletterSignup',
    name: 'Newsletter Signup',
    icon: '📧',
    defaultProperties: {
      placeholder: 'Enter your email',
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
      ctaText: {
        type: 'string',
        label: 'CTA text',
        required: false,
        order: 2,
      },
      placeholder: {
        type: 'string',
        label: 'Input placeholder',
        required: false,
        order: 3,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'NewsletterSignup',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  text-align: center;
  padding: 2rem 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  max-width: 480px;
  margin: 0 auto;
\`;
const Title = styled.h3\`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #333;
\`;
const Subtitle = styled.p\`
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 1.5rem;
\`;
const Form = styled.form\`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
\`;
const Input = styled.input\`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-width: 200px;
\`;
const Button = styled.button\`
  padding: 0.75rem 1.5rem;
  background: #2c5530;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #1e3a21; }
\`;

function NewsletterSignup({ title, subtitle, ctaText = 'Subscribe', placeholder = 'Enter your email' }) {
  return (
    <Wrapper>
      {title && <Title>{title}</Title>}
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
      <Form onSubmit={(e) => e.preventDefault()}>
        <Input type="email" placeholder={placeholder} aria-label="Email" />
        <Button type="submit">{ctaText}</Button>
      </Form>
    </Wrapper>
  );
}
`,
  },
};
