/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { ContentItem } from '../controllers/content-item.controller';
import { Page, ResolvedPage } from '../controllers/page.controller';

export const mapPageContentItems = (page: Page): ResolvedPage => {
  return {
    ...page,
    value: {
      ...page.value,
      components: page.value.components.map(
        (component) => component.obj?.value as ContentItem['value']
      ),
    },
  };
};
