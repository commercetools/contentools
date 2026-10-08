/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderSocialLinks, type SocialLinksProps } from '@commercetools-labs/puck-components';

export type { SocialLinksProps };

export const createSocialLinksConfig = (
  intl: IntlShape
): ComponentConfig<SocialLinksProps> => {
  const labelLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.socialLinks.field.label' }, { n });
  const urlLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.socialLinks.field.url' }, { n });
  return {
  label: intl.formatMessage({ id: 'Editor.cfg.socialLinks.label' }),
  fields: {
    link1Label: { type: 'text', label: labelLabel(1) },
    link1Url: { type: 'text', label: urlLabel(1) },
    link2Label: { type: 'text', label: labelLabel(2) },
    link2Url: { type: 'text', label: urlLabel(2) },
    link3Label: { type: 'text', label: labelLabel(3) },
    link3Url: { type: 'text', label: urlLabel(3) },
    link4Label: { type: 'text', label: labelLabel(4) },
    link4Url: { type: 'text', label: urlLabel(4) },
  },
  defaultProps: {
    link1Label: '', link1Url: '',
    link2Label: '', link2Url: '',
    link3Label: '', link3Url: '',
    link4Label: '', link4Url: '',
  },
  render: renderSocialLinks,
  };
};
