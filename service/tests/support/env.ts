/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

process.env.CTP_API_URL = 'https://api.test.local';
process.env.CTP_AUTH_URL = 'https://auth.test.local';
process.env.CTP_PROJECT_KEY = 'test-project';
process.env.CTP_CLIENT_ID = 'test-client-id';
process.env.CTP_CLIENT_SECRET = 'test-client-secret';
process.env.CTP_SCOPE =
  'manage_key_value_documents:test-project view_products:test-project';
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';
