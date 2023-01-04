import { defineConfig } from 'vitest/config';
import clearVitest from './scripts/vite-plugin-clear-vitest';

const TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const event = process.env.npm_lifecycle_event;
const WATCH_TEST = TEST && event === 'test';

export default defineConfig({
  test: {
    setupFiles: ['./setup.vitest.ts'],
    environment: 'node',
    globals: true,
    css: false,
    isolate: false,
    passWithNoTests: true,
    coverage: {
      enabled: false,
    },
  },
  plugins: [
    // Clear terminal plugin for vitest
    WATCH_TEST && clearVitest(),
  ],
});
