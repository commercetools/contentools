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
});
