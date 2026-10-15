export default {
  id: 'type-b8c9d0e1-f2a3-4b1c-5d6e-7f8a9b0c1d2e',
  key: 'type-b8c9d0e1-f2a3-4b1c-5d6e-7f8a9b0c1d2e',
  metadata: {
    type: 'FooterBlock',
    name: 'Footer Block',
    icon: '📄',
    defaultProperties: {},
    propertySchema: {
      column1: {
        type: 'richText',
        label: 'Column 1 (HTML/links)',
        required: false,
        order: 0,
      },
      column2: {
        type: 'richText',
        label: 'Column 2 (HTML/links)',
        required: false,
        order: 1,
      },
      column3: {
        type: 'richText',
        label: 'Column 3 (HTML/links)',
        required: false,
        order: 2,
      },
      copyright: {
        type: 'string',
        label: 'Copyright text',
        required: false,
        order: 3,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'FooterBlock',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.footer\`
  background: #333;
  color: #eee;
  padding: 2rem 1rem;
  margin-top: 3rem;
\`;
const Grid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto 2rem;
\`;
const Column = styled.div\`
  font-size: 0.9rem;
  line-height: 1.6;
  a { color: #8bc98b; text-decoration: none; }
  a:hover { text-decoration: underline; }
\`;
const Copyright = styled.p\`
  text-align: center;
  font-size: 0.85rem;
  color: #999;
  margin: 0;
\`;

function FooterBlock({ column1, column2, column3, copyright }) {
  const columns = [column1, column2, column3].filter(Boolean);
  return (
    <Wrapper>
      {columns.length > 0 && (
        <Grid>
          {columns.map((html, i) => (
            <Column key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </Grid>
      )}
      {copyright && <Copyright>{copyright}</Copyright>}
    </Wrapper>
  );
}
`,
  },
};
