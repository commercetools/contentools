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
