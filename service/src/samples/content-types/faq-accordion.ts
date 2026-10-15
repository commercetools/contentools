export default {
  id: 'type-f8a9b0c1-d2e3-4f1a-5b6c-7d8e9f0a1b2c',
  key: 'type-f8a9b0c1-d2e3-4f1a-5b6c-7d8e9f0a1b2c',
  metadata: {
    type: 'FAQAccordion',
    name: 'FAQ Accordion',
    icon: '❓',
    defaultProperties: {},
    propertySchema: {
      question1: {
        type: 'string',
        label: 'Question 1',
        required: false,
        order: 0,
      },
      answer1: {
        type: 'richText',
        label: 'Answer 1',
        required: false,
        order: 1,
      },
      question2: {
        type: 'string',
        label: 'Question 2',
        required: false,
        order: 2,
      },
      answer2: {
        type: 'richText',
        label: 'Answer 2',
        required: false,
        order: 3,
      },
      question3: {
        type: 'string',
        label: 'Question 3',
        required: false,
        order: 4,
      },
      answer3: {
        type: 'richText',
        label: 'Answer 3',
        required: false,
        order: 5,
      },
      question4: {
        type: 'string',
        label: 'Question 4',
        required: false,
        order: 6,
      },
      answer4: {
        type: 'richText',
        label: 'Answer 4',
        required: false,
        order: 7,
      },
    },
    isBuiltIn: false,
  },
  code: {
    componentName: 'FAQAccordion',
    transpiledCode: '',
    decodedText: `import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div\`
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
\`;
const Item = styled.div\`
  border-bottom: 1px solid #eee;
  &:last-child { border-bottom: none; }
\`;
const Question = styled.button\`
  width: 100%;
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 600;
  font-size: 1rem;
  background: #fafafa;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  &:hover { background: #f5f5f5; }
\`;
const Answer = styled.div\`
  padding: 1rem 1.25rem;
  background: white;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #555;
\`;

function FAQAccordion(props) {
  const items = [
    [props.question1, props.answer1],
    [props.question2, props.answer2],
    [props.question3, props.answer3],
    [props.question4, props.answer4],
  ].filter(([q]) => q);
  const [open, setOpen] = React.useState(null);
  if (items.length === 0) return null;
  return (
    <Wrapper>
      {items.map(([question, answer], i) => (
        <Item key={i}>
          <Question onClick={() => setOpen(open === i ? null : i)}>
            {question}
            <span>{open === i ? '−' : '+'}</span>
          </Question>
          {open === i && answer && <Answer dangerouslySetInnerHTML={{ __html: answer }} />}
        </Item>
      ))}
    </Wrapper>
  );
}
`,
  },
};
