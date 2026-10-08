import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderTestimonialsSlider, type TestimonialsSliderProps } from '@commercetools-demo/puck-components';

export type { TestimonialsSliderProps };

export const createTestimonialsSliderConfig = (
  intl: IntlShape
): ComponentConfig<TestimonialsSliderProps> => {
  const quoteLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.testimonials.field.quote' }, { n });
  const authorLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.testimonials.field.author' }, { n });
  const roleLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.testimonials.field.role' }, { n });
  return {
  label: intl.formatMessage({ id: 'Editor.cfg.testimonials.label' }),
  fields: {
    quote1: { type: 'textarea', label: quoteLabel(1) },
    author1: { type: 'text', label: authorLabel(1) },
    role1: { type: 'text', label: roleLabel(1) },
    quote2: { type: 'textarea', label: quoteLabel(2) },
    author2: { type: 'text', label: authorLabel(2) },
    role2: { type: 'text', label: roleLabel(2) },
    quote3: { type: 'textarea', label: quoteLabel(3) },
    author3: { type: 'text', label: authorLabel(3) },
    role3: { type: 'text', label: roleLabel(3) },
  },
  defaultProps: {
    quote1: '', author1: '', role1: '',
    quote2: '', author2: '', role2: '',
    quote3: '', author3: '', role3: '',
  },
  render: renderTestimonialsSlider,
  };
};
