/* eslint-disable no-console */
import type { Plugin } from 'vite';
import pc from 'picocolors';

const clear = () => {
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H\x1Bc\n');
};

// Clear terminal on initial and subsequent loads for vitest
const plugin = (): Plugin => ({
  name: 'clear-vitest',
  load: (p) => {
    clear();
    console.log(pc.black(pc.bgBlue(' RERUN ')), pc.gray(p.match(/(src)\/.+/)?.[0]), '\n');
  },
});

export default plugin;
