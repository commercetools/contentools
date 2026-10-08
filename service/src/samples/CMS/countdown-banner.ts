export default {
  id: 'type-e1f2a3b4-c5d6-4e4f-8a9b-0c1d2e3f4a5b',
  key: 'type-e1f2a3b4-c5d6-4e4f-8a9b-0c1d2e3f4a5b',
  metadata: {
    type: 'CountdownBanner',
    name: 'Countdown Banner',
    icon: '⏱️',
    defaultProperties: {
      background: '#2c5530',
    },
    propertySchema: {
      endDate: {
        type: 'string',
        label: 'End date (ISO)',
        required: false,
        order: 0,
      },
      headline: {
        type: 'string',
        label: 'Headline',
        required: false,
        order: 1,
      },
      subline: {
        type: 'string',
        label: 'Subline',
        required: false,
        order: 2,
      },
      ctaText: {
        type: 'string',
        label: 'CTA text',
        required: false,
        order: 3,
      },
      ctaLink: {
        type: 'string',
        label: 'CTA Link',
        required: false,
        order: 4,
      },
      background: {
        type: 'string',
        label: 'Background color',
        required: false,
        order: 5,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'CountdownBanner',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  background-color: \${props => props.background || '#2c5530'};
  color: white;
  padding: 2rem 1rem;
  text-align: center;
  border-radius: 4px;
  margin: 1rem 0;
\`;
const Headline = styled.h2\`
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
\`;
const Subline = styled.p\`
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 1rem;
\`;
const CTA = styled.a\`
  display: inline-block;
  background: white;
  color: #2c5530;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  &:hover { opacity: 0.9; }
\`;
const TimeLeft = styled.p\`
  font-size: 1.1rem;
  margin-top: 1rem;
  font-weight: 500;
\`;

function CountdownBanner({ endDate, headline, subline, ctaText, ctaLink, background }) {
  let timeLeft = '';
  if (endDate) {
    const end = new Date(endDate);
    const now = new Date();
    if (end > now) {
      const d = Math.floor((end - now) / 86400000);
      const h = Math.floor(((end - now) % 86400000) / 3600000);
      timeLeft = d > 0 ? \`\${d}d \${h}h left\` : \`\${h}h left\`;
    } else {
      timeLeft = 'Ended';
    }
  }
  return (
    <Wrapper background={background}>
      {headline && <Headline>{headline}</Headline>}
      {subline && <Subline>{subline}</Subline>}
      {timeLeft && <TimeLeft>{timeLeft}</TimeLeft>}
      {ctaText && ctaLink && <CTA href={ctaLink}>{ctaText}</CTA>}
    </Wrapper>
  );
}
`,
  },
};
