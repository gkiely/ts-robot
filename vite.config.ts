import { defineConfig } from 'vitest/config';
import checker from 'vite-plugin-checker';

import typescript from '@rollup/plugin-typescript';
import path from 'path';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint -c .eslintrc.json --cache --fix --ext ts,tsx src',
        dev: {
          logLevel: ['error'],
        },
      },
    }),
  ],
  server: {
    watch: {
      ignored: ['/coverage'],
    },
  },
  build: {
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['immer'],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: 'dist',
          exclude: ['**/*.test.ts', 'vitest.config.ts', 'setup.vitest.ts', '*.tsbuildinfo'],
        }),
      ],
    },
  },
  json: {
    stringify: true,
  },
}));
