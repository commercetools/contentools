export default {
  id: 'type-c8ef3c4e-8f07-40ef-b17c-190f06dca585',
  key: 'type-c8ef3c4e-8f07-40ef-b17c-190f06dca585',
  metadata: {
    type: 'WebsiteLogo',
    name: 'Website Logo',
    icon: '🧲',
    defaultProperties: {
      maxWidth: 180,
      maxHeight: 50,
    },
    propertySchema: {
      logo: {
        type: 'file',
        label: 'Logo',
        required: false,
        order: 0,
      },
      maxWidth: {
        type: 'number',
        label: 'Max width px',
        required: false,
        order: 1,
      },
      maxHeight: {
        type: 'number',
        label: 'Max Height px',
        required: false,
        order: 2,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'WebsiteLogo',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div\`
  max-height: \${props => props.maxHeight ? \`\${props.maxHeight}px\` : \`80px\`};
  max-width: \${props => props.maxWidth ? \`\${props.maxWidth}px\` : \`120px\`};
\`;
const StyledImage = styled.img\`
  width: 100%;
  height: 100%;
  object-fit: contain;
\`;

function WebsiteLogo({ logo, maxWidth, maxHeight }) {
  return (
    <StyledWrapper maxHeight={maxHeight} maxWidth={maxWidth}>
      <StyledImage src={logo?.url} />
    </StyledWrapper>
  );
}
`,
  },
};
