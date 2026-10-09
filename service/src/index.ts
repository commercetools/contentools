/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { ConfigurationError, readConfiguration } from './config/env';
import type { Configuration } from './config/env';
import { createApp } from './app';
import { logAuthDiagnostics } from './auth/diagnostics';
import { loadMediaConfig, MediaConfigError } from './media';
import { createShutdown } from './observability/shutdown';
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

function validateMediaConfiguration(): void {
  try {
    loadMediaConfig(process.env);
  } catch (error) {
    if (error instanceof MediaConfigError) {
      process.stderr.write(
        `${JSON.stringify({ level: 'error', message: `MediaConfigError: ${error.message}` })}\n`
      );
      process.exit(1);
    }
    throw error;
  }
}

function main(): void {
  const config = loadConfiguration();
  validateMediaConfiguration();
  const logger = getLogger();
  logAuthDiagnostics(logger, config);
  const server = createApp(config).listen(config.port, () =>
    logger.info('service listening', {
      port: config.port,
      projectKey: config.ctp.projectKey,
    })
  );
  const shutdown = createShutdown({
    server,
    exit: (code) => process.exit(code),
    log: (message, meta) => logger.info(message, meta),
  });
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
