/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

const mcAppConfig = require('@commercetools-frontend/eslint-config-mc-app');

module.exports = [
  ...mcAppConfig,
  { ignores: ['public/**', 'src/i18n/data/**', 'node_modules/**', '.local-puck/**'] },
];
