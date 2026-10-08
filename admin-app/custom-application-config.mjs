import { PERMISSIONS } from './src/constants';

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Contentools',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
    development: {
      initialProjectKey: '${env:INITIAL_PROJECT_KEY}',
    },
  },
  additionalEnv: {
    CMS_API_URL: '${env:CMS_API_URL}',
  },
  headers: {
    csp: {
      'connect-src': [
        '*.commercetools.app',
        '*.commercetools.com',
        'localhost:8080',
        "'unsafe-eval'",
        '*.us-central1.run.app',
        '*.europe-west1.run.app',
        '*.asia-southeast1.run.app',
      ],
      'script-src': [
        '*.commercetools.app',
        '*.commercetools.com',
        'localhost:8080',
        'cdn.jsdelivr.net',
        'blob:',
        "'unsafe-eval'",
        '*.us-central1.run.app',
        '*.europe-west1.run.app',
        '*.asia-southeast1.run.app',
      ],
      'style-src': ['cdn.jsdelivr.net', 'rsms.me'],
      'font-src': ['cdn.jsdelivr.net', 'rsms.me'],
      'frame-src': ['*.ct-poc.net'],
    },
  },
  oAuthScopes: {
    view: [
      'view_products',
      'view_key_value_documents',
      'view_business_units',
      'view_project_settings',
      'view_stores',
      'view_api_clients',
    ],
    manage: [
      'manage_products',
      'manage_key_value_documents',
      'manage_api_clients',
    ],
  },
  icon: '${path:@tabler/icons/filled/square-letter-c.svg}',
  mainMenuLink: {
    defaultLabel: 'Contentools',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  },
};

export default config;
