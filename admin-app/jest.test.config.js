/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';

/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: '@commercetools-frontend/jest-preset-mc-app/typescript',
  moduleNameMapper: {
    // The managers are ESM-only and heavy; tests use stand-ins that print their props.
    '^@commercetools-labs/puck-(page|content|theme)-manager$':
      '<rootDir>/src/test-utils/puck-stubs.tsx',
  },
};
