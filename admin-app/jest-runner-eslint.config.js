/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

module.exports = {
  cliOptions: {
    format: require.resolve('eslint-formatter-pretty'),
    rules: {
      'import/no-unresolved': 2,
      'prettier/prettier': [
        'error',
        { trailingComma: 'es5', singleQuote: true },
      ],
    },
  },
};
