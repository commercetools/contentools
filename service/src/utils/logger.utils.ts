/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createApplicationLogger } from '@commercetools-backend/loggers';
import { getConfiguration } from '../config/env';
import { correlationFormat } from '../observability/log-format';

type Logger = ReturnType<typeof createApplicationLogger>;

let logger: Logger | undefined;

export const getLogger = (): Logger =>
  (logger ??= createApplicationLogger({
    json: true,
    level: getConfiguration().logLevel,
    formatters: [correlationFormat],
  }));

export const resetLoggerForTests = (): void => {
  logger = undefined;
};
