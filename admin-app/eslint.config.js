const mcAppConfig = require('@commercetools-frontend/eslint-config-mc-app');

module.exports = [
  ...mcAppConfig,
  { ignores: ['public/**', 'src/i18n/data/**', 'node_modules/**', '.local-puck/**'] },
];
