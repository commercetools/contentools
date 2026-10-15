export default {
  id: 'type-c3d4e5f6-a7b8-4c6d-0e1f-2a3b4c5d6e7f',
  key: 'type-c3d4e5f6-a7b8-4c6d-0e1f-2a3b4c5d6e7f',
  metadata: {
    type: 'ImageBlock',
    name: 'Image Block',
    icon: '🖼️',
    defaultProperties: {},
    propertySchema: {
      image: {
        type: 'file',
        label: 'Image',
        required: false,
        order: 0,
      },
      caption: {
        type: 'string',
        label: 'Caption',
        required: false,
        order: 1,
      },
      link: {
        type: 'string',
        label: 'Link URL',
        required: false,
        order: 2,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'ImageBlock',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.figure\`
  margin: 1rem 0;
  text-align: center;
\`;
const StyledLink = styled.a\`
  display: inline-block;
\`;
const StyledImage = styled.img\`
  max-width: 100%;
  height: auto;
  border-radius: 4px;
\`;
const Caption = styled.figcaption\`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
\`;

function ImageBlock({ image, caption, link }) {
  if (!image?.url) return null;
  const img = <StyledImage src={image.url} alt={caption || 'Image'} />;
  return (
    <Wrapper>
      {link ? <StyledLink href={link}>{img}</StyledLink> : img}
      {caption && <Caption>{caption}</Caption>}
    </Wrapper>
  );
}
`,
  },
};
