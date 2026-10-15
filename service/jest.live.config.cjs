/** Opt-in live suite against a real sandbox project (no msw). Skipped unless the guard in tests/live/env.ts passes. */
module.exports = {
  displayName: 'live',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/live'],
  testMatch: ['<rootDir>/tests/live/**/*.live.ts'],
  setupFiles: ['<rootDir>/tests/live/env.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: { '^uuid$': '<rootDir>/tests/support/uuid-shim.ts' },
  testTimeout: 120000,
};
