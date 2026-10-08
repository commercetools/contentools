export default {
  id: 'type-d4e5f6a7-b8c9-4d7e-1f2a-3b4c5d6e7f8a',
  key: 'type-d4e5f6a7-b8c9-4d7e-1f2a-3b4c5d6e7f8a',
  metadata: {
    type: 'Divider',
    name: 'Divider',
    icon: '➖',
    defaultProperties: {
      lineStyle: 'solid',
      spacing: 24,
    },
    propertySchema: {
      lineStyle: {
        type: 'string',
        label: 'Line style',
        required: false,
        order: 0,
        options: [
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
        ],
      },
      spacing: {
        type: 'number',
        label: 'Spacing (px)',
        required: false,
        order: 1,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'Divider',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Line = styled.hr\`
  border: none;
  border-top: 1px \${props => props.lineStyle === 'dashed' ? 'dashed' : props.lineStyle === 'dotted' ? 'dotted' : 'solid'} #ddd;
  margin: \${props => (props.spacing || 24) / 2}px 0;
\`;

function Divider({ lineStyle = 'solid', spacing = 24 }) {
  return <Line lineStyle={lineStyle} spacing={spacing} />;
}
`,
  },
};
