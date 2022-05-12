// @ts-check

/**
 * @typedef {object} Config
 * @prop {string|string[]} [root]
 * @prop {Matcher[]} match
 */

/**
 * @callback Matcher
 * @param {FileEntry} ent
 * @returns {undefined|Iterable<[path: string, builder: Buildable]>}
 */

/**
 * @callback Builder
 * @param {string} id
 * @param {FileEntry} input
 * @param {FileEntry} output
 * @returns {Promise<void>}
 */

/**
 * @callback BuildIdentifier
 * @param {FileEntry} priorOutput
 * @returns {Promise<string>}
 */

/**
 * @typedef {object} Buildable
 * @prop {Builder} build
 * @prop {BuildIdentifier} lastBuilt
 */

/** @typedef {object} FileEntry
 * @prop {string} root
 * @prop {string} name
 * @prop {string} path
 */

import * as fs from 'fs/promises';
import {
  basename,
  dirname,
  join as joinPaths,
  resolve,
} from 'path';

/** @callback LeveledLogger
 * @param {number} level
 * @param {any} mess
 * @param {...any} rest
 */

/** @typedef {object} CmdContext
 * @prop {LeveledLogger} log
 */

/** @param {CmdContext} ctx
 * @param {string} configPath
 */
async function loadConfig({ log }, configPath) {
  if (!configPath) {
    for (let dir = process.cwd(); dir.length; dir = dirname(dir)) {
      let testPath = joinPaths(dir, 'generate.config.js');
      if (await fs.stat(testPath).then(() => true).catch(() => false)) {
        configPath = testPath;
        log(2, 'found', { configPath });
        break;
      }
    }
  }

  const value = (await import(configPath)).default;
  if (typeof value !== 'object') {
    throw new Error('invalid config: not an object');
  }

  if ('root' in value &&
    typeof value.root !== 'string' &&
    !(Array.isArray(value.root) &&
      value.root.every(/** @param {any} datum */ datum => typeof datum === 'string'))
  ) {
    throw new Error('invalid config: bad root value');
  }

  if (!(
    'match' in value &&
    Array.isArray(value.match) &&
    /** @type {any[]} */(value.match).every(value => typeof value === 'function')
  )) {
    console.log(value);
    throw new Error('invalid config: invalid matcher(s), must be an array of functions');
  }

  const configDir = dirname(configPath);
  const config = /** @type {Config} */(value);

  if (!config.root) {
    config.root = resolve(configDir, '.');
  } else if (typeof config.root === 'string') {
    config.root = resolve(configDir, config.root);
  } else if (Array.isArray(config.root)) {
    config.root = config.root.map(dir => resolve(configDir, dir));
  }

  // TODO narrower type where root is required; maybe also lift to singleton array here
  return config;
}

/** @param {Config} config */
async function* iterBuild(config) {
  const { root: configRoot = '.' } = config;
  const roots = Array.isArray(configRoot) ? configRoot : [configRoot];

  /** @type {Set<string>} */
  const seen = new Set();

  for (const root of roots) {
    for await (const { name, path } of iterFiles(root)) {
      const ent = Object.freeze({ root, name, path });
      for (const match of config.match) {
        const matches = match(ent) || [];
        for (const [newPath, buildable] of matches) {
          if (seen.has(newPath)) {
            throw new Error(`duplicate built path ${newPath}`);
          }
          seen.add(newPath);
          yield {
            input: ent,
            output: Object.freeze({
              root,
              path: newPath,
              name: basename(newPath),
            }),
            buildable
          };
        }
      }
    }
  }
}

import {
  createHash,
} from 'node:crypto'

/** @param {string} path */
async function hashFilePath(path) {
  const file = await fs.open(path, 'r');
  const hash = createHash('sha256');
  const buffer = Buffer.alloc(16384);
  while (true) {
    const { bytesRead } = await file.read({ buffer });
    if (!bytesRead) { break }
    hash.update(buffer.subarray(0, bytesRead));
  }
  await file.close();
  return hash.digest('hex');
}

/** @param {string[]} args */
async function main(args) {
  let logLevel = 0;
  let configPath = '';
  let didHelp = false;
  args = parseArgs(args, consume => {
    consume('-v', 0, () => logLevel++);
    consume('-c', 1, ([_, path]) => configPath = path);
    consume('-h', 0, () => {
      didHelp = true;
      console.log('Usage: generate.js [-h] [-v] [-c config.js] build|check');
      console.log('  -v to increase verbosity');
      console.log('  -c to override config module path');
      console.log('  -h for this screen');
    });
  });
  if (didHelp) { return }

  /** @type {CmdContext} */
  const ctx = {
    log(level, mess, ...rest) {
      if (level <= logLevel) {
        console.log(mess, ...rest);
      }
      if (level < 0) {
        process.exit(-level);
      }
    },
  };

  const cmdName = args.shift();
  if (!cmdName) {
    ctx.log(-1, 'Missing generate command; did you mean "build"?');
  }

  const config = await loadConfig(ctx, configPath);

  switch (cmdName) {

    case 'build':
      await buildem(ctx, config, args);
      break;

    case 'check':
      await checkem(ctx, config);
      break;

    default:
      ctx.log(-1, 'Invalid generate command; there is only "build" and "check"');
  }
}

/** @param {CmdContext} ctx
 * @param {Config} config
 * @param {string[]} args
 */
async function buildem({ log }, config, args) {
  let force = false;
  args = parseArgs(args, consume => {
    consume('-f', 0, () => force = true);
  });
  /** @type {(path: string) => boolean} */
  const filter =
    args.length ? (() => {
      const only = new Set(args.map(path => resolve(path)));
      return only.has.bind(only);
    })() : () => true;
  if (args.length) {
    force = true;
  }

  /** @type {Promise<void>[]} */
  const work = [];

  // TODO make it concurrent over each file; easier to debug/develop when serial tho
  for await (const {
    input,
    output,
    buildable: { lastBuilt, build },
  } of iterBuild(config)) {
    if (!filter(input.path) && !filter(output.path)) {
      continue;
    }
    work.push((async () => {
      const [id, priorID] = await Promise.all([
        hashFilePath(input.path),
        lastBuilt(output).catch(() => ''),
      ]);
      if (force || priorID !== id) {
        try {
          await build(id, input, output);
          log(0, 'built', output.path, 'from', input.path);
        } catch (err) {
          log(0, 'fail', output.path, err);
        }
      } else {
        log(1, 'ok', output.path);
      }
    })());
  }

  await Promise.all(work);
}

/** @param {CmdContext} ctx
 * @param {Config} config
 */
async function checkem({ log }, config) {
  log(1, 'checking that generated sources are up to date');

  /** @type {Promise<{inPath: string, outPath: string, id: string, priorID: string}>[]} */
  const work = [];

  // TODO make it concurrent over each file; easier to debug/develop when serial tho
  for await (const {
    input: { path: inPath },
    output,
    buildable: { lastBuilt },
  } of iterBuild(config)) {
    const { path: outPath } = output;
    work.push((async () => {
      const [id, priorID] = await Promise.all([
        hashFilePath(inPath),
        lastBuilt(output).catch(() => ''),
      ]);
      return {
        outPath,
        inPath,
        priorID,
        id,
      }
    })());
  }

  let allOk = true;
  for (const { outPath, inPath, id, priorID } of await Promise.all(work)) {
    const ok = id == priorID;
    if (ok) {
      log(1, outPath, 'from', inPath, id);
    } else {
      log(0, 'FAIL', outPath, 'from', inPath, `id:${id}`, `prior:${priorID}`);
    }
    allOk = allOk && ok;
  }
  process.exit(allOk ? 0 : 1);
}

/** Pattern matching callback passed to an ArgsConsumer to consume one or more
 * arguments anchored by a static (maybe list of) expected sentinel strings.
 *
 * @callback ConsumeArgs
 * @param {string|string[]} expect -- e.g. '--option' or ['-o', '--option']
 * @param {number} arity -- how many parameter arguments to consume after the
 *   sentinel, typically 0 or 1
 * @param {(args: string[]) => void} then -- consumer callback to handle
 *   matched arguments, receives the sentinel and any parameters; may be called
 *   more than once if an argument was given multiple times by the user
 * @returns {void}
 */

/** Primary driver under parseArgs, expected to call consume 0 or more times,
 * and may call fail.
 *
 * @callback ArgsConsumer
 * @param {ConsumeArgs} consume
 * @param {(mess: string) => void} fail
 * @returns {void}
 */

/** Parse arguments by matching and consuming tokens from an arguments list.
 * Returns all unconsumed arguments.
 * Matching stops at any '--' argument.
 *
 * @param {string[]} args
 * @param {ArgsConsumer} consumer
 * @param {(mess: string) => void} fail
 */
function parseArgs(args, consumer, fail = mess => {
  console.error(mess);
  process.exit(1);
}) {
  consumer((expect, arity, then) => {
    if (typeof expect === 'string') { expect = [expect] }
    let i = 0, j = 0
    while (j < args.length) {
      if (args[j] === '--') {
        break;
      } else if (expect.includes(args[j])) {
        if (j + arity >= args.length) {
          fail(`${args.length} argument requires ${arity} subsequent argument(s)`);
        }
        const end = j + arity + 1;
        then(args.slice(j, end));
        j = end;
      } else {
        args[i++] = args[j++];
      }
    }
    while (j < args.length) {
      args[i++] = args[j++];
    }
    args.length = i;
  }, fail);
  return args;
}

/** @param {string} dir */
async function* iterFiles(dir) {
  for (const name of await fs.readdir(dir)) {
    const path = joinPaths(dir, name);
    const info = await fs.stat(path);
    if (info.isDirectory()) {
      yield* iterFiles(path); // TODO depth limit ; link cycle break
    } else {
      yield { dir, name, path, info };
    }
  }
}

await main(process.argv.slice(2));
