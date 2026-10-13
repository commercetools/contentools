/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const entry = path.resolve(__dirname, '../../build/index.js');

describe('bootstrap', () => {
  beforeAll(() => {
    if (!existsSync(entry)) {
      const built = spawnSync('yarn', ['build'], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
      });
      expect(built.status).toBe(0);
    }
  }, 120000);

  it('exits non-zero without CTP_PROJECT_KEY, naming it and hiding the secret', () => {
    const result = spawnSync('node', [entry], {
      env: {
        PATH: process.env.PATH,
        CTP_API_URL: 'https://api.test.local',
        CTP_AUTH_URL: 'https://auth.test.local',
        CTP_CLIENT_ID: 'id',
        CTP_CLIENT_SECRET: ['client', 'secret', 'value'].join('-'),
      },
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CTP_PROJECT_KEY');
    expect(result.stderr).not.toContain('client-secret-value');
  });
});
