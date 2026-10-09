/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { PERMISSIONS } from './src/constants';

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Contentools',
  description:
    'Manage pages, content items and the theme of your storefront content.',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    // Local development only (`yarn start`). Read directly: a ${env:} placeholder throws when the variable
    // is missing, and Connect never provides CTP_INITIAL_PROJECT_KEY to the production build.
    development: { initialProjectKey: process.env.CTP_INITIAL_PROJECT_KEY ?? '' },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  // Read directly: a ${env:} placeholder throws when unset, and the first deployment has no service URL yet.
  // The value ends up in the public window.app; it is not secret.
  additionalEnv: { serviceUrl: process.env.CONTENTOOLS_SERVICE_URL ?? '' },
  oAuthScopes: {
    view: ['view_business_units'],
    manage: ['manage_key_value_documents'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/files.svg}',
  mainMenuLink: {
    defaultLabel: 'Contentools',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  },
};

export default config;
