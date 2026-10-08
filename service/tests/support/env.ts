/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Runs BEFORE test files import the app (jest `setupFiles`). Fake values only.
Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  CTP_PROJECT_KEY: 'test-project',
  CTP_CLIENT_ID: 'test-client-id',
  CTP_CLIENT_SECRET: 'test-client-secret',
  CTP_SCOPE: 'manage_key_value_documents:test-project view_products:test-project',
  CTP_API_URL: 'https://api.ct.test',
  CTP_AUTH_URL: 'https://auth.ct.test',
  CTP_REGION: 'europe-west1.gcp',
  SERVICE_API_TOKEN: 'test-service-token',
  MAX_VERSIONS: '3',
});
