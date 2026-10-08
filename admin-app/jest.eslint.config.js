/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  runner: 'jest-runner-eslint',
  displayName: 'eslint',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  modulePathIgnorePatterns: [
    '.yarn',
    '.cache',
    'build/',
    'dist/',
    'public/',
    'generated',
  ],
  testMatch: ['<rootDir>/**/*.js', '<rootDir>/**/*.ts', '<rootDir>/**/*.tsx'],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-runner-eslint/watch-fix',
  ],
};
