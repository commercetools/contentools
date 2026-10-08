export default {
  id: 'type-e8b00437-631b-47b8-9bc0-29ffd4d26ef0',
  key: 'type-e8b00437-631b-47b8-9bc0-29ffd4d26ef0',
  metadata: {
    type: 'HeroBanner',
    name: 'Hero Banner',
    icon: '🖼️',
    defaultProperties: {},
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 1,
      },
      subtitle: {
        type: 'string',
        label: 'Subtitle',
        required: false,
        order: 2,
      },
      image: {
        type: 'file',
        label: 'Image',
        required: false,
        order: 3,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'HeroBanner',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const HeroContainer = styled.div\`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  overflow: hidden;
  background-color: #f0f0f0;
\`;
const HeroImage = styled.img\`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
\`;
const TextOverlay = styled.div\`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 2;
  padding: 2rem;
  max-width: 90%;
\`;
const Title = styled.h1\`
  font-size: 3rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  @media (max-width: 768px) {
    font-size: 2rem;
  }
\`;
const Subtitle = styled.p\`
  font-size: 1.25rem;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  opacity: 0.95;
  @media (max-width: 768px) {
    font-size: 1rem;
  }
\`;
const ImageOverlay = styled.div\`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
\`;

function HeroBanner({ image, title, subtitle }) {
  return (
    <HeroContainer>
      {image?.url && (
        <HeroImage
          src={image.url}
          alt={title || 'Hero banner'}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <ImageOverlay />
      <TextOverlay>
        {title && <Title>{title}</Title>}
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </TextOverlay>
    </HeroContainer>
  );
}
`,
  },
};
