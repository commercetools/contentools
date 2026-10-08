export default {
  id: 'type-a3b4c5d6-e7f8-4a6b-0c1d-2e3f4a5b6c7d',
  key: 'type-a3b4c5d6-e7f8-4a6b-0c1d-2e3f4a5b6c7d',
  metadata: {
    type: 'ProductGridHeader',
    name: 'Product Grid Header',
    icon: '📋',
    defaultProperties: {},
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 0,
      },
      description: {
        type: 'richText',
        label: 'Description',
        required: false,
        order: 1,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'ProductGridHeader',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  margin-bottom: 2rem;
  padding: 0 1rem;
\`;
const Title = styled.h1\`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.75rem;
\`;
const Description = styled.div\`
  font-size: 1rem;
  color: #666;
  line-height: 1.5;
  max-width: 720px;
\`;

function ProductGridHeader({ title, description }) {
  return (
    <Wrapper>
      {title && <Title>{title}</Title>}
      {description && (
        <Description dangerouslySetInnerHTML={{ __html: description }} />
      )}
    </Wrapper>
  );
}
`,
  },
};
