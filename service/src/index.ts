/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { ConfigurationError, readConfiguration } from './config/env';
import type { Configuration } from './config/env';
import { createApp } from './app';
import { getLogger } from './utils/logger.utils';

function loadConfiguration(): Configuration {
  try {
    return readConfiguration();
  } catch (error) {
    const message =
      error instanceof ConfigurationError
        ? error.message
        : 'Configuration failed';
    process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);
    process.exit(1);
  }
}

function main(): void {
  const config = loadConfiguration();
  const logger = getLogger();
  const server = createApp().listen(config.port, () =>
    logger.info('service listening', {
      port: config.port,
      projectKey: config.ctp.projectKey,
    })
  );
  const shutdown = (signal: string): void => {
    logger.info('shutting down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
