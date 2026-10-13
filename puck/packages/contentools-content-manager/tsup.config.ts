/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'react-router-dom',
    '@commercetools-labs/contentools-types',
    '@commercetools-labs/contentools-api',
    '@commercetools-labs/contentools-editor',
    '@commercetools-labs/contentools-renderer',
  ],
  // @measured/puck is bundled (not external) — same pattern as contentools-editor
});
