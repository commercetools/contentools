import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const pkg = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

/**
 * All first-party monorepo packages.
 * - resolve.alias  → points Vite at source files instead of dist/
 * - optimizeDeps.exclude → prevents Vite from pre-bundling them into
 *   .vite/deps/, which would cache a stale snapshot and suppress HMR.
 */
const monorepoPackages = [
  '@commercetools-demo/puck-api',
  '@commercetools-demo/puck-components',
  '@commercetools-demo/puck-editor',
  '@commercetools-demo/puck-version-history',
  '@commercetools-demo/puck-content-manager',
  '@commercetools-demo/puck-page-manager',
  '@commercetools-demo/puck-renderer',
  '@commercetools-demo/puck-types',
];

const sourceAlias: Record<string, string> = {
  '@commercetools-demo/puck-api':             pkg('../packages/puck-api/src/index.ts'),
  '@commercetools-demo/puck-components':       pkg('../packages/puck-components/src/index.ts'),
  '@commercetools-demo/puck-editor':           pkg('../packages/puck-editor/src/index.ts'),
  '@commercetools-demo/puck-version-history':  pkg('../packages/puck-version-history/src/index.ts'),
  '@commercetools-demo/puck-content-manager':  pkg('../packages/puck-content-manager/src/index.ts'),
  '@commercetools-demo/puck-page-manager':     pkg('../packages/puck-page-manager/src/index.ts'),
  '@commercetools-demo/puck-renderer':         pkg('../packages/puck-renderer/src/index.ts'),
  '@commercetools-demo/puck-types':            pkg('../packages/puck-types/src/index.ts'),
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
