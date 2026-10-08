/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderVideoBlock, type VideoBlockProps } from '@commercetools-labs/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { VideoBlockProps };

export const createVideoBlockConfig = (
  intl: IntlShape
): ComponentConfig<VideoBlockProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.videoBlock.label' }),
  fields: {
    videoUrl: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.videoBlock.field.videoUrl' }) },
    posterImage: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.videoBlock.field.posterImage' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.videoBlock.field.title' }) },
    caption: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.videoBlock.field.caption' }) },
  },
  defaultProps: { videoUrl: '', posterImage: '', title: '', caption: '' },
  render: renderVideoBlock,
});
