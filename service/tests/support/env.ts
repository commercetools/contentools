// Runs BEFORE test files import the app (jest `setupFiles`). Fake values only.
Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  CTP_PROJECT_KEY: 'test-project',
  CTP_CLIENT_ID: 'test-client-id',
  CTP_CLIENT_SECRET: ['test', 'client', 'secret'].join('-'),
  CTP_SCOPE: 'manage_key_value_documents:test-project view_products:test-project',
  CTP_API_URL: 'https://api.ct.test',
  CTP_AUTH_URL: 'https://auth.ct.test',
  CTP_REGION: 'europe-west1.gcp',
  CONNECT_SERVICE_URL: 'https://service.test.local/service',
  CLOUD_IDENTIFIER: 'gcp-eu',
  SERVICE_API_TOKEN: ['test', 'service', 'token', '0123456789', 'abcdefghij'].join('-'),
  MAX_VERSIONS: '3',
});
