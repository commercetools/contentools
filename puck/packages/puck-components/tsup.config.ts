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
    'react-intl',
    '@measured/puck',
    '@commercetools-demo/puck-api',
    '@commercetools-demo/puck-types',
    // Conditionally require()s jsdom for SSR sanitization — resolve from
    // node_modules rather than bundling.
    'isomorphic-dompurify',
  ],
});
