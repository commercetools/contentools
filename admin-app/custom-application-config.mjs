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
    // Local development only (`yarn start`). Read from process.env, not a ${env:} placeholder: a placeholder
    // throws when the variable is missing (its name is trimmed, so a trailing space does not avoid that), and
    // Connect never provides CTP_INITIAL_PROJECT_KEY to the production build. The schema requires the key, so
    // it falls back to an empty string there; it is only used by `yarn start`.
    development: { initialProjectKey: process.env.CTP_INITIAL_PROJECT_KEY ?? '' },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  // Ends up in the public window.app; it is not secret.
  additionalEnv: {
    serviceUrl: '${env:CONTENTOOLS_SERVICE_URL}',
    // Local development only: the service's SERVICE_API_TOKEN, sent when the service URL is local (no proxy
    // there, so no Merchant Center session). Optional, and never taken into a production build.
    devServiceToken:
      process.env.NODE_ENV === 'production'
        ? ''
        : (process.env.CONTENTOOLS_DEV_SERVICE_TOKEN ?? ''),
  },
    headers: {
    csp: {

      'script-src': [
        'cdn.jsdelivr.net',
        'blob:',
        "'unsafe-eval'",
      ],
      'style-src': ['cdn.jsdelivr.net', 'rsms.me'],
      'font-src': ['cdn.jsdelivr.net', 'rsms.me'],
    },
  },
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
