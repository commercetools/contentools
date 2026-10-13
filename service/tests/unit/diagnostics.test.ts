/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { logAuthDiagnostics } from '../../src/auth/diagnostics';
import { readConfiguration, type Env } from '../../src/config/env';

const base: Env = {
  CTP_API_URL: 'https://api.test.local',
  CTP_AUTH_URL: 'https://auth.test.local',
  CTP_PROJECT_KEY: 'p',
  CTP_CLIENT_ID: 'id',
  CTP_CLIENT_SECRET: 'secret',
};
const MC: Env = {
  CONNECT_SERVICE_URL: 'https://service.test.local/service',
  CLOUD_IDENTIFIER: 'gcp-eu',
};
const TOKEN = 'a'.repeat(40);

const run = (env: Env) => {
  const logger = { info: jest.fn(), warn: jest.fn() };
  logAuthDiagnostics(logger, readConfiguration({ ...base, ...env }));
  return logger;
};

describe('logAuthDiagnostics', () => {
  it('logs enabled kinds without warnings when both are on', () => {
    const logger = run({ ...MC, SERVICE_API_TOKEN: TOKEN });
    expect(logger.info).toHaveBeenCalledWith('authentication', {
      merchantCenter: true,
      serviceToken: true,
      requiredPermission: null,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns that Merchant Center verification is disabled', () => {
    const logger = run({ SERVICE_API_TOKEN: TOKEN });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(String(logger.warn.mock.calls[0]?.[0])).toContain(
      'Merchant Center token verification is disabled'
    );
  });

  it('warns that every protected route answers 401 when nothing is enabled', () => {
    const logger = run({});
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(String(logger.warn.mock.calls[1]?.[0])).toContain(
      'every protected route will answer 401'
    );
  });

  it('never logs the token value', () => {
    const logger = run({ ...MC, SERVICE_API_TOKEN: TOKEN });
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(TOKEN);
  });
});
