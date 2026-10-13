/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
module.exports = {
  maxWorkers: 2, // Connect runs every app's tests at once in memory-limited containers; two bounded workers (a single process hits the V8 heap limit under --coverage)
  workerIdleMemoryLimit: '512MB', // recycle a worker once it holds more than this
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: process.env.MCP_E2E_SERVICE_URL ? ['/node_modules/'] : ['/node_modules/', '/tests/e2e/'],
  transform: {
    '^.+\\.(t|m?j)sx?$': [
      'ts-jest',
      {
        tsconfig: { allowJs: true, module: 'commonjs', moduleResolution: 'node10', esModuleInterop: true, target: 'ES2022', strict: true, skipLibCheck: true },
        diagnostics: false,
        isolatedModules: true, // no per-file type program: keeps worker memory small (types are checked by yarn typecheck)
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs|@open-draft|rettime|until-async|strict-event-emitter|outvariant|is-node-process|headers-polyfill)/)'],
};
