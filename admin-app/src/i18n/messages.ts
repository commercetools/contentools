/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

export default defineMessages({
  pages: { id: 'Contentools.nav.pages', defaultMessage: 'Pages' },
  items: { id: 'Contentools.nav.items', defaultMessage: 'Items' },
  theme: { id: 'Contentools.nav.theme', defaultMessage: 'Theme' },
  businessUnit: {
    id: 'Contentools.businessUnit',
    defaultMessage: 'Business unit',
  },
  collapse: { id: 'Contentools.sidebar.collapse', defaultMessage: 'Collapse' },
  expandTitle: {
    id: 'Contentools.sidebar.expand',
    defaultMessage: 'Expand sidebar',
  },
  collapseTitle: {
    id: 'Contentools.sidebar.collapseTitle',
    defaultMessage: 'Collapse sidebar',
  },
  serviceNotConfigured: {
    id: 'Contentools.serviceNotConfigured',
    defaultMessage:
      'The service URL is not configured. Set CONTENTOOLS_SERVICE_URL (https, ending in /service) in the deployment configuration and redeploy.',
  },
  requestFailed: {
    id: 'Contentools.requestFailed',
    defaultMessage: 'The request to the service failed: {message}',
  },
  notAllowed: {
    id: 'Contentools.notAllowed',
    defaultMessage:
      'You are not allowed to do this. Ask an administrator for the manage permission.',
  },
});
