export default {
  id: 'type-e5f6a7b8-c9d0-4e8f-2a3b-4c5d6e7f8a9b',
  key: 'type-e5f6a7b8-c9d0-4e8f-2a3b-4c5d6e7f8a9b',
  metadata: {
    type: 'Spacer',
    name: 'Spacer',
    icon: '↕️',
    defaultProperties: {
      height: 32,
    },
    propertySchema: {
      height: {
        type: 'number',
        label: 'Height (px)',
        required: false,
        order: 0,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'Spacer',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const SpacerDiv = styled.div\`
  height: \${props => props.height || 32}px;
  width: 100%;
\`;

function Spacer({ height = 32 }) {
  return <SpacerDiv height={height} />;
}
`,
  },
};
