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
  '@commercetools-labs/contentools-api',
  '@commercetools-labs/contentools-components',
  '@commercetools-labs/contentools-editor',
  '@commercetools-labs/contentools-version-history',
  '@commercetools-labs/contentools-content-manager',
  '@commercetools-labs/contentools-page-manager',
  '@commercetools-labs/contentools-renderer',
  '@commercetools-labs/contentools-types',
  '@commercetools-labs/contentools-theme-manager',
  '@commercetools-labs/contentools-image-picker',
];

const sourceAlias: Record<string, string> = {
  '@commercetools-labs/contentools-api':             pkg('../packages/contentools-api/src/index.ts'),
  '@commercetools-labs/contentools-components':       pkg('../packages/contentools-components/src/index.ts'),
  '@commercetools-labs/contentools-editor':           pkg('../packages/contentools-editor/src/index.ts'),
  '@commercetools-labs/contentools-version-history':  pkg('../packages/contentools-version-history/src/index.ts'),
  '@commercetools-labs/contentools-content-manager':  pkg('../packages/contentools-content-manager/src/index.ts'),
  '@commercetools-labs/contentools-page-manager':     pkg('../packages/contentools-page-manager/src/index.ts'),
  '@commercetools-labs/contentools-renderer':         pkg('../packages/contentools-renderer/src/index.ts'),
  '@commercetools-labs/contentools-types':            pkg('../packages/contentools-types/src/index.ts'),
  '@commercetools-labs/contentools-theme-manager':    pkg('../packages/contentools-theme-manager/src/index.ts'),
  '@commercetools-labs/contentools-image-picker':     pkg('../packages/contentools-image-picker/src/index.ts'),
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
