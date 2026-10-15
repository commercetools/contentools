export default {
  id: 'type-f6a7b8c9-d0e1-4f9a-3b4c-5d6e7f8a9b0c',
  key: 'type-f6a7b8c9-d0e1-4f9a-3b4c-5d6e7f8a9b0c',
  metadata: {
    type: 'TrustBadges',
    name: 'Trust Badges',
    icon: '🛡️',
    defaultProperties: {},
    propertySchema: {
      badge1Icon: {
        type: 'file',
        label: 'Badge 1 Icon',
        required: false,
        order: 0,
      },
      badge1Label: {
        type: 'string',
        label: 'Badge 1 Label',
        required: false,
        order: 1,
      },
      badge2Icon: {
        type: 'file',
        label: 'Badge 2 Icon',
        required: false,
        order: 2,
      },
      badge2Label: {
        type: 'string',
        label: 'Badge 2 Label',
        required: false,
        order: 3,
      },
      badge3Icon: {
        type: 'file',
        label: 'Badge 3 Icon',
        required: false,
        order: 4,
      },
      badge3Label: {
        type: 'string',
        label: 'Badge 3 Label',
        required: false,
        order: 5,
      },
      badge4Icon: {
        type: 'file',
        label: 'Badge 4 Icon',
        required: false,
        order: 6,
      },
      badge4Label: {
        type: 'string',
        label: 'Badge 4 Label',
        required: false,
        order: 7,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'TrustBadges',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
  padding: 2rem 1rem;
  background: #f9f9f9;
  border-radius: 4px;
\`;
const Badge = styled.div\`
  display: flex;
  align-items: center;
  gap: 0.75rem;
\`;
const Icon = styled.img\`
  width: 40px;
  height: 40px;
  object-fit: contain;
\`;
const Label = styled.span\`
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
\`;

function TrustBadges(props) {
  const badges = [
    [props.badge1Icon, props.badge1Label],
    [props.badge2Icon, props.badge2Label],
    [props.badge3Icon, props.badge3Label],
    [props.badge4Icon, props.badge4Label],
  ].filter(([, label]) => label);
  if (badges.length === 0) return null;
  return (
    <Wrapper>
      {badges.map(([icon, label], i) => (
        <Badge key={i}>
          {icon?.url && <Icon src={icon.url} alt={label} />}
          <Label>{label}</Label>
        </Badge>
      ))}
    </Wrapper>
  );
}
`,
  },
};
