/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'e2e',
  testEnvironment: 'node',
  rootDir: __dirname,
  // Only the guarded harness suites. The legacy black-box suites in this folder still need the old auth
  // and are removed or rewritten by specs C/F.
  testMatch: ['<rootDir>/smoke.e2e.ts', '<rootDir>/sandbox/**/*.e2e.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/support/env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/support/after-all.ts'],
  testTimeout: 30000,
};
