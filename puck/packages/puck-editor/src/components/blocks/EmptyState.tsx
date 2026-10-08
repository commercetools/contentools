/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderEmptyState, type EmptyStateProps } from '@commercetools-labs/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { EmptyStateProps };

export const createEmptyStateConfig = (
  intl: IntlShape
): ComponentConfig<EmptyStateProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.emptyState.label' }),
  fields: {
    image: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.emptyState.field.image' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.emptyState.field.title' }) },
    description: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.emptyState.field.description' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.emptyState.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.emptyState.field.ctaLink' }) },
  },
  defaultProps: { image: '', title: '', description: '', ctaText: '', ctaLink: '' },
  render: renderEmptyState,
});
