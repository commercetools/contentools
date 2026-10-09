/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { ContentoolsClient } from '../../src/core';
import { buildApp } from '../../src/server/app';
import { loadConfig } from '../../src/server/config';
import { buildFakeService } from './fake-service';

const MCP_TOKEN = 'm'.repeat(40);
const SERVICE_TOKEN = 's'.repeat(40);

buildFakeService(SERVICE_TOKEN).listen(8081);
const config = loadConfig({
  CONTENT_SERVICE_URL: 'http://localhost:8081/service',
  MCP_ACCESS_TOKEN: MCP_TOKEN,
  SERVICE_API_TOKEN: SERVICE_TOKEN,
  MCP_ENABLE_WRITES: 'true',
});
buildApp({
  config,
  client: new ContentoolsClient({ baseUrl: config.serviceUrl, token: config.serviceToken, timeoutMs: config.timeoutMs }),
}).listen(config.port, () => {
  console.log('fake service :8081, mcp :8080');
  console.log('MCP_ACCESS_TOKEN is 40 x "m"; EXPECT_WRITES=true');
});
