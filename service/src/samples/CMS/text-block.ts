export default {
  id: 'type-b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  key: 'type-b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  metadata: {
    type: 'TextBlock',
    name: 'Text Block',
    icon: '📝',
    defaultProperties: {},
    propertySchema: {
      content: {
        type: 'richText',
        label: 'Content',
        required: false,
        order: 0,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'TextBlock',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  line-height: 1.6;
  color: #333;
  ul { padding-left: 1.5rem; margin: 1rem 0; }
  li { margin-bottom: 0.5rem; }
  p { margin-bottom: 1rem; }
  h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
\`;

function TextBlock({ content }) {
  if (!content) return null;
  return <Wrapper dangerouslySetInnerHTML={{ __html: content }} />;
}
`,
  },
};
