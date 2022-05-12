// @ts-check

import {
  join, dirname,
} from 'node:path';

import {
  copyFile,
  readFile,
  writeFile,
  stat,
} from 'node:fs/promises';

import {
  ok, system,
} from './clikit.js';

// TODO config driven

async function main() {
  const config = await loadConfig();
  await build(...config);
}

/** @typedef {(Step|string)[]} Manifest */

async function loadConfig() {
  let configPath = ''
  for (let dir = process.cwd(); dir.length; dir = dirname(dir)) {
    let testPath = join(dir, 'build.config.js');
    if (await ok(stat(testPath))) {
      configPath = testPath;
      break;
    }
  }

  const value = (await import(configPath)).default;
  if (!Array.isArray(value)) {
    throw new Error('invalid config: not an array');
  }

  // TODO validate manifest items

  return /** @type {Manifest} */ (value);
}

await main();

/** @typedef {object} Spec
 * @prop {string} path
 * @prop {(content: string) => Promise<string>} [transform]
 */

/** @typedef {object} Cmd
 * @prop {string[]} cmd
 */

/** @typedef {object} Do
 * @prop {() => Promise<void>} do
 */

/** @typedef {Spec|Cmd|Do} Step */

/** @param {Manifest} manifest */
async function build(...manifest) {

  /** @type {Promise<void>[]} */
  const work = [];

  let i = 0;
  for (; i < manifest.length; i++) {
    let step = manifest[i];
    if (typeof step === 'string') {
      step = { path: step };
    }

    if (isSyncStep(step)) {
      if (!work.length) {
        work.push(doStep(step));
        i++;
      }
      break;
    }

    work.push(doStep(step));
  }
  const rest = manifest.slice(i);

  /** @type {Promise<void>} */
  const p =
    !work.length
      ? Promise.resolve()
      : work.length === 1
        ? work[0]
        : new Promise((resolve, reject) => {
          Promise.allSettled(work).then(all => {
            for (const res of all) {
              if (res.status === 'rejected') {
                reject(res.reason);
              }
            }
            resolve();
          });
        });

  return rest.length
    ? p.then(() => build(...rest))
    : p;
}

/** @param {Step} step */
function isSyncStep(step) {
  return 'cmd' in step || 'do' in step;
}

/**
 * @param {Step} step
 * @returns {Promise<void>}
 */
async function doStep(step) {
  if ('do' in step) {
    return step.do();
  }

  if ('cmd' in step) {
    const { cmd: [cmd, ...args] } = step;
    return system(cmd, ...args).then(() => undefined);
  }

  const { path, transform } = step;
  const buildPath = join('build', path);

  if (!transform) {
    console.log(`copy ${path} => ${buildPath}`);
    return copyFile(path, buildPath)
  }

  console.log(`transform ${path} => ${buildPath}`);
  const input = await readFile(path, { encoding: 'utf-8' });
  const output = await transform(input);
  return writeFile(buildPath, output);
}
