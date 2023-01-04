import { expect, vi } from 'vitest';

// Fail if console logs
// When not running in watch or coverage mode
if (process.env.VITEST_MODE !== 'WATCH' && process.env.npm_lifecycle_event !== 'coverage') {
  const { log } = console;
  const reportError = (msg: string, type: 'log' | 'warn' | 'error') => {
    log(msg);
    const err = new Error(`console.${type} was called`);
    expect.fail(
      (err.stack as string)
        .replace(/(.+setup\.vitest\.ts.+\n+)/g, '')
        .replace(/.+file:\/\/\/.+\n/g, '')
        .replace(/.+\/node_modules\/.+\n?/g, '')
    );
  };

  vi.stubGlobal('console', {
    log: (msg: string) => reportError(msg, 'log'),
    warn: (msg: string) => reportError(msg, 'warn'),
    error: (msg: string) => reportError(msg, 'error'),
  });
}
