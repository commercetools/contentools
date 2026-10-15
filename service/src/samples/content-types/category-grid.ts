export default {
  id: 'type-c9d0e1f2-a3b4-4c2d-6e7f-8a9b0c1d2e3f',
  key: 'type-c9d0e1f2-a3b4-4c2d-6e7f-8a9b0c1d2e3f',
  metadata: {
    type: 'CategoryGrid',
    name: 'Category Grid',
    icon: '📂',
    defaultProperties: {},
    propertySchema: {
      category1Image: {
        type: 'file',
        label: 'Category 1 Image',
        required: false,
        order: 0,
      },
      category1Label: {
        type: 'string',
        label: 'Category 1 Label',
        required: false,
        order: 1,
      },
      category1Link: {
        type: 'string',
        label: 'Category 1 Link',
        required: false,
        order: 2,
      },
      category2Image: {
        type: 'file',
        label: 'Category 2 Image',
        required: false,
        order: 3,
      },
      category2Label: {
        type: 'string',
        label: 'Category 2 Label',
        required: false,
        order: 4,
      },
      category2Link: {
        type: 'string',
        label: 'Category 2 Link',
        required: false,
        order: 5,
      },
      category3Image: {
        type: 'file',
        label: 'Category 3 Image',
        required: false,
        order: 6,
      },
      category3Label: {
        type: 'string',
        label: 'Category 3 Label',
        required: false,
        order: 7,
      },
      category3Link: {
        type: 'string',
        label: 'Category 3 Link',
        required: false,
        order: 8,
      },
      category4Image: {
        type: 'file',
        label: 'Category 4 Image',
        required: false,
        order: 9,
      },
      category4Label: {
        type: 'string',
        label: 'Category 4 Label',
        required: false,
        order: 10,
      },
      category4Link: {
        type: 'string',
        label: 'Category 4 Link',
        required: false,
        order: 11,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'CategoryGrid',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Grid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 2rem 1rem;
\`;
const Card = styled.a\`
  display: block;
  text-align: center;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
\`;
const ImageWrap = styled.div\`
  aspect-ratio: 1;
  background: #f0f0f0;
  overflow: hidden;
\`;
const Img = styled.img\`
  width: 100%;
  height: 100%;
  object-fit: cover;
\`;
const Label = styled.span\`
  display: block;
  padding: 1rem;
  font-weight: 600;
  color: #333;
\`;

function CategoryGrid(props) {
  const categories = [
    [props.category1Image, props.category1Label, props.category1Link],
    [props.category2Image, props.category2Label, props.category2Link],
    [props.category3Image, props.category3Label, props.category3Link],
    [props.category4Image, props.category4Label, props.category4Link],
  ].filter(([, label, link]) => label && link);
  if (categories.length === 0) return null;
  return (
    <Grid>
      {categories.map(([image, label, link], i) => (
        <Card key={i} href={link}>
          <ImageWrap>
            {image?.url ? <Img src={image.url} alt={label} /> : null}
          </ImageWrap>
          <Label>{label}</Label>
        </Card>
      ))}
    </Grid>
  );
}
`,
  },
};
