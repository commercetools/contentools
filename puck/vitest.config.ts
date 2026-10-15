import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Resolve sibling workspace packages from source so tests do not need a build.
const packagesDir = fileURLToPath(new URL('./packages', import.meta.url));
const alias = Object.fromEntries(
  readdirSync(packagesDir).map((name) => [
    `@commercetools-labs/${name}`,
    fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
  ])
);

export default defineConfig({
  resolve: { alias },
  test: {
    // the publish-script test packs ten packages; 5 s is too tight when other test files run in parallel
    testTimeout: 30_000,
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          environment: 'jsdom',
          include: ['packages/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
        },
      },
      {
        // the mock service tests need Node's own fetch, FormData and File
        extends: true,
        test: {
          name: 'mock-server',
          environment: 'node',
          include: ['playground/mock-server/**/*.test.mjs'],
        },
      },
    ],
  },
});
