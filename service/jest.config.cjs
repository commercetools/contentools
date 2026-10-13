/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

const fs = require('node:fs');
const path = require('node:path');

// Connect runs `yarn test` inside a container that holds only this folder: suites that read repo-root files
// (connect.yaml, docs/) cannot run there and are covered by the repo-level `yarn verify`.
const repoRoot = fs.existsSync(path.join(__dirname, '..', 'connect.yaml'));
const repoLevelSuites = ['/tests/connect/(manifest|drift|readme|env-example)\\.test', '/tests/docs/'];

/** Unit + integration tests. Live e2e has its own config in e2e/jest.config.js. */
module.exports = {
  displayName: 'service',
  testEnvironment: 'node', // NOT jsdom: msw 2 needs Node's fetch/Request globals
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: repoRoot ? ['/node_modules/'] : ['/node_modules/', ...repoLevelSuites],
  testMatch: ['**/tests/{unit,integration,media,connect,observability,docs}/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/support/env.ts'], // runs BEFORE test files import the app
  setupFilesAfterEnv: ['<rootDir>/tests/support/msw-setup.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json', isolatedModules: true }] }, // types are checked by `yarn typecheck`; isolatedModules keeps the workers small
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: { '^uuid$': '<rootDir>/tests/support/uuid-shim.ts' }, // uuid is ESM-only
  clearMocks: true,
  maxWorkers: 2, // Connect runs every app's tests at once in memory-limited containers; two bounded workers (a single process hits the V8 heap limit under --coverage)
  workerIdleMemoryLimit: '512MB', // recycle a worker once it holds more than this, so the heap never grows across 50+ suites
};
