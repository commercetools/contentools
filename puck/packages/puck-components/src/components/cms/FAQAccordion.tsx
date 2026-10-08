import React, { useState } from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';
import { RichTextContent } from '../RichTextContent';

export interface FAQAccordionProps {
  question1: string; answer1: string;
  question2: string; answer2: string;
  question3: string; answer3: string;
  question4: string; answer4: string;
}

export const renderFAQAccordion: NonNullable<ComponentConfig<FAQAccordionProps>['render']> = (props) => {
  const items = [
    [props.question1, props.answer1],
    [props.question2, props.answer2],
    [props.question3, props.answer3],
    [props.question4, props.answer4],
  ].filter(([q]) => q) as [string, string][];

  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return (
    <div style={{ padding: '1rem', color: '#999', fontSize: '13px' }}>
      <FormattedMessage id="Editor.noFaqItemsConfigured" />
    </div>
  );

  return (
    <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(([question, answer], i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid #eee' : 'none' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '1rem',
              background: '#fafafa',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {question}
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && answer && (
            <RichTextContent
              html={answer}
              style={{
                padding: '1rem 1.25rem',
                background: 'white',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                color: '#555',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
