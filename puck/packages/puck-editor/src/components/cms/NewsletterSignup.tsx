import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderNewsletterSignup, type NewsletterSignupProps } from '@commercetools-demo/puck-components';

export type { NewsletterSignupProps };

export const createNewsletterSignupConfig = (
  intl: IntlShape
): ComponentConfig<NewsletterSignupProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.newsletterSignup.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.newsletterSignup.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.newsletterSignup.field.subtitle' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.newsletterSignup.field.ctaText' }) },
    placeholder: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.newsletterSignup.field.placeholder' }) },
  },
  defaultProps: { title: '', subtitle: '', ctaText: 'Subscribe', placeholder: 'Enter your email' },
  render: renderNewsletterSignup,
});
