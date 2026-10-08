import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderThankYouContent, type ThankYouContentProps } from '@commercetools-demo/puck-components';
import { richTextField } from '../../fields/RichTextField';

export type { ThankYouContentProps };

export const createThankYouContentConfig = (
  intl: IntlShape
): ComponentConfig<ThankYouContentProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.thankYouContent.label' }),
  fields: {
    headline: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.thankYouContent.field.headline' }) },
    message: richTextField(intl.formatMessage({ id: 'Editor.cfg.thankYouContent.field.message' })),
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.thankYouContent.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.thankYouContent.field.ctaLink' }) },
  },
  defaultProps: { headline: 'Thank you for your order!', message: '', ctaText: '', ctaLink: '' },
  render: renderThankYouContent,
});
