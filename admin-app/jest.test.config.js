/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';
// Tests assume the default registered path. Connect's test container injects a placeholder value instead.
process.env.ENTRY_POINT_URI_PATH = 'contentools';

/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: '@commercetools-frontend/jest-preset-mc-app/typescript',
  moduleNameMapper: {
    // The managers are ESM-only and heavy; tests use stand-ins that print their props.
    '^@commercetools-labs/contentools-(page|content|theme)-manager$':
      '<rootDir>/src/test-utils/puck-stubs.tsx',
  },
};
