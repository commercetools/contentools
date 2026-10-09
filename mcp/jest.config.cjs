/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: process.env.MCP_E2E_SERVICE_URL ? ['/node_modules/'] : ['/node_modules/', '/tests/e2e/'],
  transform: {
    '^.+\\.(t|m?j)sx?$': [
      'ts-jest',
      {
        tsconfig: { allowJs: true, module: 'commonjs', moduleResolution: 'node10', esModuleInterop: true, target: 'ES2022', strict: true, skipLibCheck: true },
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs|@open-draft|rettime|until-async|strict-event-emitter|outvariant|is-node-process|headers-polyfill)/)'],
};
