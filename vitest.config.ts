import { defineConfig } from 'vitest/config';
// import clearVitest from './scripts/vite-plugin-clear-vitest';

// const TEST =
//   typeof process !== 'undefined' &&
//   process.env.NODE_ENV === 'test' &&
//   process.env.npm_lifecycle_event === 'test';

export default defineConfig({
  test: {
    setupFiles: ['./setup.vitest.ts'],
    environment: 'node',
    globals: true,
    css: false,
    isolate: false,
    passWithNoTests: true,
    coverage: {
      enabled: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**/*.{ts,tsx}'],
      // '100': true, // 100% coverage
    },
  },
  plugins: [
    // Clear terminal plugin for vitest
    // TEST && clearVitest(),
  ],
});
