export default {
  id: 'type-e7f8a9b0-c1d2-4e0f-4a5b-6c7d8e9f0a1b',
  key: 'type-e7f8a9b0-c1d2-4e0f-4a5b-6c7d8e9f0a1b',
  metadata: {
    type: 'DeliveryMessage',
    name: 'Delivery Message',
    icon: '🚚',
    defaultProperties: {},
    propertySchema: {
      message: {
        type: 'string',
        label: 'Message',
        required: false,
        order: 0,
      },
      threshold: {
        type: 'number',
        label: 'Free shipping threshold (amount)',
        required: false,
        order: 1,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'DeliveryMessage',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  padding: 0.75rem 1rem;
  background: #f0f7f0;
  border-radius: 4px;
  font-size: 0.95rem;
  color: #2c5530;
\`;

function DeliveryMessage({ message = 'Free delivery on orders over $50', threshold }) {
  const text = threshold != null && message
    ? message.replace(/\\$\\d+/g, '$' + threshold)
    : message;
  if (!text) return null;
  return <Wrapper>{text}</Wrapper>;
}
`,
  },
};
