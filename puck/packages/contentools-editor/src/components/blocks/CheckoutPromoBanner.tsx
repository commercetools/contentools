/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCheckoutPromoBanner, type CheckoutPromoBannerProps } from '@commercetools-labs/contentools-components';

export type { CheckoutPromoBannerProps };

export const createCheckoutPromoBannerConfig = (
  intl: IntlShape
): ComponentConfig<CheckoutPromoBannerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.checkoutPromoBanner.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.checkoutPromoBanner.field.title' }) },
    message: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.checkoutPromoBanner.field.message' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.checkoutPromoBanner.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.checkoutPromoBanner.field.ctaLink' }) },
  },
  defaultProps: { title: '', message: '', ctaText: '', ctaLink: '' },
  render: renderCheckoutPromoBanner,
});
