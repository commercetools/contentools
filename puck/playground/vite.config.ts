/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const pkg = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

/**
 * All first-party workspace packages.
 * - resolve.alias  → points Vite at source files instead of dist/
 * - optimizeDeps.exclude → prevents Vite from pre-bundling them into
 *   .vite/deps/, which would cache a stale snapshot and suppress HMR.
 */
const monorepoPackages = [
  '@commercetools-labs/puck-api',
  '@commercetools-labs/puck-components',
  '@commercetools-labs/puck-editor',
  '@commercetools-labs/puck-version-history',
  '@commercetools-labs/puck-content-manager',
  '@commercetools-labs/puck-page-manager',
  '@commercetools-labs/puck-renderer',
  '@commercetools-labs/puck-types',
  '@commercetools-labs/puck-theme-manager',
  '@commercetools-labs/puck-image-picker',
];

const sourceAlias: Record<string, string> = {
  '@commercetools-labs/puck-api':             pkg('../packages/puck-api/src/index.ts'),
  '@commercetools-labs/puck-components':       pkg('../packages/puck-components/src/index.ts'),
  '@commercetools-labs/puck-editor':           pkg('../packages/puck-editor/src/index.ts'),
  '@commercetools-labs/puck-version-history':  pkg('../packages/puck-version-history/src/index.ts'),
  '@commercetools-labs/puck-content-manager':  pkg('../packages/puck-content-manager/src/index.ts'),
  '@commercetools-labs/puck-page-manager':     pkg('../packages/puck-page-manager/src/index.ts'),
  '@commercetools-labs/puck-renderer':         pkg('../packages/puck-renderer/src/index.ts'),
  '@commercetools-labs/puck-types':            pkg('../packages/puck-types/src/index.ts'),
  '@commercetools-labs/puck-theme-manager':    pkg('../packages/puck-theme-manager/src/index.ts'),
  '@commercetools-labs/puck-image-picker':     pkg('../packages/puck-image-picker/src/index.ts'),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: sourceAlias,
  },
  optimizeDeps: {
    // Don't pre-bundle monorepo packages — process them as source so HMR works.
    exclude: monorepoPackages,
  },
  server: {
    port: 5174,
  },
});
