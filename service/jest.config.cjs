/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** Unit + integration tests. Live e2e has its own config in e2e/jest.config.js. */
module.exports = {
  displayName: 'service',
  testEnvironment: 'node', // NOT jsdom: msw 2 needs Node's fetch/Request globals
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: ['/node_modules/', '/src/_pending/'],
  testMatch: ['**/tests/{unit,integration,media}/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/support/env.ts'], // runs BEFORE test files import the app
  setupFilesAfterEnv: ['<rootDir>/tests/support/msw-setup.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: { '^uuid$': '<rootDir>/tests/support/uuid-shim.ts' }, // uuid is ESM-only
  clearMocks: true,
};
