export default {
  id: 'type-b0c1d2e3-f4a5-4b3c-7d8e-9f0a1b2c3d4e',
  key: 'type-b0c1d2e3-f4a5-4b3c-7d8e-9f0a1b2c3d4e',
  metadata: {
    type: 'TabContent',
    name: 'Tab Content',
    icon: '📑',
    defaultProperties: {},
    propertySchema: {
      tabLabel: {
        type: 'string',
        label: 'Tab label',
        required: false,
        order: 0,
      },
      content: {
        type: 'richText',
        label: 'Content',
        required: false,
        order: 1,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'TabContent',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  padding: 1.5rem 0;
  line-height: 1.6;
  color: #333;
  ul { padding-left: 1.5rem; margin: 1rem 0; }
  li { margin-bottom: 0.5rem; }
  p { margin-bottom: 1rem; }
\`;

function TabContent({ tabLabel, content }) {
  if (!content) return null;
  return (
    <Wrapper>
      {tabLabel && <h3 style={{ marginBottom: '1rem' }}>{tabLabel}</h3>}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </Wrapper>
  );
}
`,
  },
};
