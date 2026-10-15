import { createApplicationLogger } from '@commercetools-backend/loggers';
import { getConfiguration } from '../config/env';
import {
  correlationFormat,
  timestampFormat,
} from '../observability/log-format';

type Logger = ReturnType<typeof createApplicationLogger>;

let logger: Logger | undefined;

export const getLogger = (): Logger =>
  (logger ??= createApplicationLogger({
    json: true,
    level: getConfiguration().logLevel,
    formatters: [timestampFormat, correlationFormat],
  }));

export const resetLoggerForTests = (): void => {
  logger = undefined;
};
