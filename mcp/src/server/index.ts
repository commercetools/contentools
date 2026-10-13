/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { ContentoolsClient } from '../core';
import { buildApp } from './app';
import { loadConfig } from './config';
import { log } from './logger';

const config = (() => {
  try {
    return loadConfig();
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
})();

const app = buildApp({
  config,
  client: new ContentoolsClient({
    baseUrl: config.serviceUrl,
    token: config.serviceToken,
    timeoutMs: config.timeoutMs,
  }),
});

app.listen(config.port, () =>
  log({ msg: 'mcp.listening', port: config.port, writes: config.enableWrites })
);
