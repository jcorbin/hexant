// @ts-check

import {
  join,
} from 'node:path';

import {
  readdir,
  stat,
} from 'node:fs/promises';

import { spawn } from 'node:child_process';

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
export function parseArgs(args, consumer, fail = mess => {
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
export async function* iterFiles(dir) {
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) {
      yield* iterFiles(path); // TODO depth limit ; link cycle break
    } else {
      yield { dir, name, path, info };
    }
  }
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export function system(cmd, ...args) {
  const proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    const chunks = [];
    proc.stdout.on('data', chunk => chunks.push(chunk));
    proc.once('error', reject);
    proc.once('close', code => {
      if (code === 0) {
        resolve(chunks.join(''));
      } else {
        reject(new Error(`${JSON.stringify([cmd, ...args])} exited ${code}`));
      }
    });
  });
}

/** @param {Promise<unknown>} p */
export function ok(p) {
  return p.then(() => true).catch(() => false);
}
