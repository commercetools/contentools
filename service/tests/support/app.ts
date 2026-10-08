/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Express } from 'express';
import { createApp } from '../../src/app';
import { resetConfigurationForTests } from '../../src/config/env';
import { resetApiRootForTests } from '../../src/ct/client';
import { resetLoggerForTests } from '../../src/utils/logger.utils';

export function makeApp(): Express {
  resetConfigurationForTests();
  resetApiRootForTests();
  resetLoggerForTests();
  return createApp();
}
