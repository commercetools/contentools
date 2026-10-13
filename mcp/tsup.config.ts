/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { defineConfig } from 'tsup';

const external = [
  'ai',
  '@langchain/core',
  'zod',
  '@modelcontextprotocol/sdk',
  /^@modelcontextprotocol\/sdk\//,
  /^@langchain\/core\//,
];

export default defineConfig([
  {
    entry: {
      index: 'src/core/index.ts',
      'ai-sdk/index': 'src/adapters/ai-sdk/index.ts',
      'langchain/index': 'src/adapters/langchain/index.ts',
      'mcp/index': 'src/mcp/index.ts',
    },
    outDir: 'dist',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node22',
    external,
  },
  {
    entry: { 'stdio/index': 'src/stdio/index.ts' },
    outDir: 'dist',
    format: ['cjs'],
    dts: false,
    sourcemap: false,
    clean: false,
    target: 'node22',
    external,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
