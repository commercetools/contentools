export default {
  id: 'type-c1d2e3f4-a5b6-4c4d-8e9f-0a1b2c3d4e5f',
  key: 'type-c1d2e3f4-a5b6-4c4d-8e9f-0a1b2c3d4e5f',
  metadata: {
    type: 'TestimonialsSlider',
    name: 'Testimonials Slider',
    icon: '💬',
    defaultProperties: {},
    propertySchema: {
      quote1: {
        type: 'string',
        label: 'Quote 1',
        required: false,
        order: 0,
      },
      author1: {
        type: 'string',
        label: 'Author 1',
        required: false,
        order: 1,
      },
      role1: {
        type: 'string',
        label: 'Role 1',
        required: false,
        order: 2,
      },
      quote2: {
        type: 'string',
        label: 'Quote 2',
        required: false,
        order: 3,
      },
      author2: {
        type: 'string',
        label: 'Author 2',
        required: false,
        order: 4,
      },
      role2: {
        type: 'string',
        label: 'Role 2',
        required: false,
        order: 5,
      },
      quote3: {
        type: 'string',
        label: 'Quote 3',
        required: false,
        order: 6,
      },
      author3: {
        type: 'string',
        label: 'Author 3',
        required: false,
        order: 7,
      },
      role3: {
        type: 'string',
        label: 'Role 3',
        required: false,
        order: 8,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'TestimonialsSlider',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  padding: 2rem 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 1rem 0;
\`;
const Quote = styled.blockquote\`
  font-size: 1.15rem;
  font-style: italic;
  color: #444;
  margin: 0 0 1rem 0;
  padding: 0 1rem;
  border-left: 4px solid #2c5530;
\`;
const Author = styled.cite\`
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  font-style: normal;
\`;
const Role = styled.span\`
  font-size: 0.85rem;
  color: #666;
  font-weight: normal;
\`;

function TestimonialsSlider(props) {
  const items = [
    [props.quote1, props.author1, props.role1],
    [props.quote2, props.author2, props.role2],
    [props.quote3, props.author3, props.role3],
  ].filter(([q]) => q);
  if (items.length === 0) return null;
  return (
    <Wrapper>
      {items.map(([quote, author, role], i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? '2rem' : 0 }}>
          <Quote>{quote}</Quote>
          {author && (
            <Author>
              — {author}
              {role && <Role> ({role})</Role>}
            </Author>
          )}
        </div>
      ))}
    </Wrapper>
  );
}
`,
  },
};
