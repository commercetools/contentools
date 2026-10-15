export default {
  id: 'type-a7b8c9d0-e1f2-4a0b-4c5d-6e7f8a9b0c1d',
  key: 'type-a7b8c9d0-e1f2-4a0b-4c5d-6e7f8a9b0c1d',
  metadata: {
    type: 'SocialLinks',
    name: 'Social Links',
    icon: '🔗',
    defaultProperties: {},
    propertySchema: {
      link1Label: {
        type: 'string',
        label: 'Link 1 Label',
        required: false,
        order: 0,
      },
      link1Url: {
        type: 'string',
        label: 'Link 1 URL',
        required: false,
        order: 1,
      },
      link2Label: {
        type: 'string',
        label: 'Link 2 Label',
        required: false,
        order: 2,
      },
      link2Url: {
        type: 'string',
        label: 'Link 2 URL',
        required: false,
        order: 3,
      },
      link3Label: {
        type: 'string',
        label: 'Link 3 Label',
        required: false,
        order: 4,
      },
      link3Url: {
        type: 'string',
        label: 'Link 3 URL',
        required: false,
        order: 5,
      },
      link4Label: {
        type: 'string',
        label: 'Link 4 Label',
        required: false,
        order: 6,
      },
      link4Url: {
        type: 'string',
        label: 'Link 4 URL',
        required: false,
        order: 7,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'SocialLinks',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0;
\`;
const Link = styled.a\`
  color: #2c5530;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  &:hover { text-decoration: underline; }
\`;

function SocialLinks(props) {
  const links = [
    [props.link1Label, props.link1Url],
    [props.link2Label, props.link2Url],
    [props.link3Label, props.link3Url],
    [props.link4Label, props.link4Url],
  ].filter(([label, url]) => label && url);
  if (links.length === 0) return null;
  return (
    <Wrapper>
      {links.map(([label, url], i) => (
        <Link key={i} href={url} target="_blank" rel="noopener noreferrer">{label}</Link>
      ))}
    </Wrapper>
  );
}
`,
  },
};
