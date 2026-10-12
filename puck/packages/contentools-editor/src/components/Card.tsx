/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCard, type CardProps } from '@commercetools-labs/contentools-components';
import { RichTextField } from '../fields/RichTextField';
import { createFontSizeField } from '../fields/fontSizeField';
import { createRadiusField } from '../fields/sizeFields';

export type { CardProps };

export const createCardConfig = (intl: IntlShape): ComponentConfig<CardProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.card.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.card.field.title' }) },
    titleFontSize: createFontSizeField(intl, intl.formatMessage({ id: 'Editor.cfg.card.field.titleFontSize' })),
    body: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.card.field.body' }),
      render: ({ value, onChange }) => (
        <RichTextField value={value as string} onChange={onChange} />
      ),
    },
    imageUrl: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.card.field.imageUrl' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.card.field.ctaText' }) },
    ctaUrl: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.card.field.ctaUrl' }) },
    shadow: {
      type: 'radio',
      label: intl.formatMessage({ id: 'Editor.cfg.card.field.shadow' }),
      options: [
        { value: true, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.yes' }) },
        { value: false, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.no' }) },
      ],
    },
    borderRadius: createRadiusField(intl.formatMessage({ id: 'Editor.cfg.card.field.borderRadius' })),
  },
  defaultProps: {
    title: 'Card Title',
    body: 'Card description goes here.',
    shadow: true,
    borderRadius: '8px',
  },
  render: renderCard,
});
