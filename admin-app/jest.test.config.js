process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';

/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: '@commercetools-frontend/jest-preset-mc-app/typescript',
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  moduleNameMapper: {
    // The managers are ESM-only and heavy; tests use stand-ins that print their props.
    '^@commercetools-labs/contentools-(page|content|theme)-manager$':
      '<rootDir>/src/test-utils/puck-stubs.tsx',
  },
};
