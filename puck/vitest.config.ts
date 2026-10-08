/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

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
    environment: 'jsdom',
    globals: false,
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
