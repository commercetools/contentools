export default {
  id: 'type-a9b0c1d2-e3f4-4a2b-6c7d-8e9f0a1b2c3d',
  key: 'type-a9b0c1d2-e3f4-4a2b-6c7d-8e9f0a1b2c3d',
  metadata: {
    type: 'VideoBlock',
    name: 'Video Block',
    icon: '🎬',
    defaultProperties: {},
    propertySchema: {
      videoUrl: {
        type: 'string',
        label: 'Video URL',
        required: false,
        order: 0,
      },
      posterImage: {
        type: 'file',
        label: 'Poster image',
        required: false,
        order: 1,
      },
      title: {
        type: 'string',
        label: 'Title',
        required: false,
        order: 2,
      },
      caption: {
        type: 'string',
        label: 'Caption',
        required: false,
        order: 3,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'VideoBlock',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  margin: 1.5rem 0;
\`;
const VideoWrap = styled.div\`
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  background: #000;
  border-radius: 8px;
\`;
const Video = styled.video\`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
\`;
const Title = styled.h4\`
  margin-top: 0.75rem;
  font-size: 1.1rem;
  color: #333;
\`;
const Caption = styled.p\`
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
\`;

function VideoBlock({ videoUrl, posterImage, title, caption }) {
  if (!videoUrl) return null;
  return (
    <Wrapper>
      <VideoWrap>
        <Video
          src={videoUrl}
          poster={posterImage?.url}
          controls
          preload="metadata"
        />
      </VideoWrap>
      {title && <Title>{title}</Title>}
      {caption && <Caption>{caption}</Caption>}
    </Wrapper>
  );
}
`,
  },
};
