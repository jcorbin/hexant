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

/** @callback DoFn
 * @returns {Promise<void>}
 */

/** @typedef {object} Do
 * @prop {DoFn|DoFn[]} do
 */

/** @typedef {Spec|Cmd|Do} Step */

/** @param {Manifest} manifest */
async function build(...manifest) {
  // do one or more manifest steps that can be done concurrently
  // CLI {cmd}s and custom {do} functions cause synchronization points

  /** @type {Promise<void>[]} */
  const stage = [];

  let i = 0;
  for (; i < manifest.length; i++) {
    let step = manifest[i];
    if (typeof step === 'string') {
      step = { path: step };
    }

    if (isSyncStep(step)) {
      if (!stage.length) {
        stage.push(doStep(step));
        i++;
      }
      break;
    }

    stage.push(doStep(step));
  }
  const rest = manifest.slice(i);

  const stageDone = Promise.allSettled(stage).then(() => Promise.all(stage));
  return stageDone.then(() => rest.length ? build(...rest) : Promise.resolve());
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
    if (Array.isArray(step.do)) {
      const work = step.do.map(f => f())
      await Promise.all(work).then(() => Promise.allSettled(work));
      return;
    }
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
