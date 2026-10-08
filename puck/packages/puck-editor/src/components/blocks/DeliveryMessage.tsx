/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderDeliveryMessage, type DeliveryMessageProps } from '@commercetools-labs/puck-components';

export type { DeliveryMessageProps };

export const createDeliveryMessageConfig = (
  intl: IntlShape
): ComponentConfig<DeliveryMessageProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.deliveryMessage.label' }),
  fields: {
    message: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.deliveryMessage.field.message' }) },
    threshold: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.deliveryMessage.field.threshold' }) },
  },
  defaultProps: { message: 'Free delivery on orders over $50', threshold: '' },
  render: renderDeliveryMessage,
});
