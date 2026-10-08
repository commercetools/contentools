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
    '@commercetools-demo/puck-types',
    '@commercetools-demo/puck-api',
    '@commercetools-demo/puck-version-history',
    // Keep external: it conditionally require()s jsdom for SSR sanitization,
    // which must resolve from node_modules rather than be bundled.
    'isomorphic-dompurify',
  ],
});
