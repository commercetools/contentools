/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';

/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  extends: ['@commercetools-frontend/eslint-config-mc-app'],
  plugins: ['graphql'],
  overrides: [
    {
      files: ['**/*.ctp.graphql'],
      rules: {
        'graphql/template-strings': [
          'error',
          {
            env: 'literal',
            schemaJson: require('./schemas/ctp.json'),
          },
        ],
      },
    },
  ],
};
