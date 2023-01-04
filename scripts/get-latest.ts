/* eslint-disable no-console */
import packageJSON from '../package.json';

const blacklist: string[] = [];

const deps =
  Object.keys({
    ...packageJSON.dependencies,
    ...packageJSON.devDependencies,
  })
    .filter((k) => !blacklist.includes(k))
    .join('@latest ') + '@latest';

// Output to shell
console.log(deps);
