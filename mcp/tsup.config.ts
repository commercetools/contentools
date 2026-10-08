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
