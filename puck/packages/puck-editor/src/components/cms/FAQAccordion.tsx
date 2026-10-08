import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderFAQAccordion, type FAQAccordionProps } from '@commercetools-demo/puck-components';
import { richTextField } from '../../fields/RichTextField';

export type { FAQAccordionProps };

export const createFAQAccordionConfig = (
  intl: IntlShape
): ComponentConfig<FAQAccordionProps> => {
  const questionLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.faqAccordion.field.question' }, { n });
  const answerLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.faqAccordion.field.answer' }, { n });
  return {
  label: intl.formatMessage({ id: 'Editor.cfg.faqAccordion.label' }),
  fields: {
    question1: { type: 'text', label: questionLabel(1) },
    answer1: richTextField(answerLabel(1)),
    question2: { type: 'text', label: questionLabel(2) },
    answer2: richTextField(answerLabel(2)),
    question3: { type: 'text', label: questionLabel(3) },
    answer3: richTextField(answerLabel(3)),
    question4: { type: 'text', label: questionLabel(4) },
    answer4: richTextField(answerLabel(4)),
  },
  defaultProps: {
    question1: '', answer1: '',
    question2: '', answer2: '',
    question3: '', answer3: '',
    question4: '', answer4: '',
  },
  render: renderFAQAccordion,
  };
};
