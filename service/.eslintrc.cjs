/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

module.exports = {
  root: true,
  ignorePatterns: ['build', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': 'error',
    'no-const-assign': 'error',
  },
  overrides: [
    {
      files: ['e2e/**/*.ts', 'tests/**/*.ts'],
      rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off', 'no-undef': 'off' },
    },
  ],
  env: {
    es6: true,
    jest: true,
    node: true, //adds things like process to global
  },
};
