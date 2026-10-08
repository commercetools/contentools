/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/ai-sdk/index.ts'],
    outDir: 'ai-sdk',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['ai', 'zod'],
    noExternal: [],
  },
  {
    entry: ['src/langchain/index.ts'],
    outDir: 'langchain',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['@langchain/core', 'zod'],
    noExternal: [],
  },
]);
