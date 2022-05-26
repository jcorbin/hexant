// @ts-check

'use strict';

import * as rezult from '../rezult.js';

import { parseRaw } from './parse.js';

import {
  parse as parseTurmite,
  compile as compileTurmite,
  Turmite,
} from './index.js';

/** @typedef {import('stream').Readable} Readable */

/** @typedef {object} TestCtx
 * @prop {Readable} stdin
 * @prop {string[]} args
 */

/** @callback TestAction
 * @param {TestCtx} ctx
 * @returns {AsyncIterableIterator<string|{log: any[]}>}
 */

/** @type {Map<string, TestAction>} */
const testActions = new Map();

/** @type {TestAction} */
function runTestAction({ args: [action, ...args], ...rest }) {
  const testAction = testActions.get(action);
  if (!testAction) throw message(
    `Invalid test action: ${action}`,
    `Possible actions: ${[...testActions.keys()].sort().join(' ')}`,
  );
  return testAction({ args, ...rest });
}

testActions.set('diffRules', async function*({ args: [str1, str2] }) {
  const { rules: rules1, specString: spec1 } = rezult.toValue(Turmite.from(str1));
  const { rules: rules2, specString: spec2 } = rezult.toValue(Turmite.from(str2));
  yield spec1;
  yield '-- vs';
  yield spec2;
  yield* diff([
    Buffer.from(rules1.buffer).toString('hex').split(/\n/),
    Buffer.from(rules2.buffer).toString('hex').split(/\n/),
  ]);
});

testActions.set('run', async function*({ args }) {
  if (!args.length) throw message('must provide a copmiled module path to run');
  const [path] = args;
  const module = await import(path);

  const { default: build } = module;
  if (typeof build !== 'function') {
    yield { log: ['Loaded', path, module] };
    throw message('module lacks a default export build()');
  }

  yield* dump(rezult.toValue(Turmite.from(build)));
});

testActions.set('parse', async function*({ stdin }) {
  const str = await bufferStream(stdin);
  const node = rezult.toValue(parseRaw(str));
  yield JSON.stringify(node, null, 2);
});

testActions.set('dump', async function*({ stdin }) {
  const str = await bufferStream(stdin);

  const builder = rezult.toValue(parseTurmite(str));
  yield 'BUILDER:';
  yield builder.toString();

  yield* dump(rezult.toValue(Turmite.from(builder)));
});

testActions.set('compile', async function*({ stdin }) {
  const str = await bufferStream(stdin);
  yield* compileTurmite(str, { format: 'module' });
});

/** @param {Turmite} ent */
function* dump(ent) {
  const { numStates, numColors, specString, rules } = ent;

  yield `numStates: ${numStates}`;
  yield `numColors: ${numColors}`;

  let first = true;
  for (const line of specString.split(/\n/)) {
    yield first
      ? `spec: ${line}`
      : `      ${line}`;
    first = false;
  }

  yield 'rules:';

  const {
    ColorByteWidth,
    StateByteWidth,
    TurnByteWidth,
    MaskResultColor,
    MaskResultState,
    MaskResultTurn,
    ResultColorShift,
    ResultStateShift,
    ResultTurnShift,
    KeyColorMask,
    KeyStateMask,
    KeyColorShift,
    KeyStateShift,
  } = Turmite.TestSpec;

  const statePart = 'S'.repeat(StateByteWidth * 2);
  const colorPart = 'C'.repeat(ColorByteWidth * 2);
  const turnPart = 'T'.repeat(TurnByteWidth * 2);
  yield `[ ${statePart} ${colorPart} ] => ${statePart} ${colorPart} ${turnPart} -- S:state C:color T:turn`;

  /** @param {number} k */
  const fmt = k => {
    const result = rules[k];
    const ks = (k & KeyStateMask) >> KeyStateShift;
    const kc = (k & KeyColorMask) >> KeyColorShift;
    const rs = (result & MaskResultState) >> ResultStateShift;
    const rc = (result & MaskResultColor) >> ResultColorShift;
    const rt = (result & MaskResultTurn) >> ResultTurnShift;
    return `[ ${hexit(ks, StateByteWidth)} ${hexit(kc, ColorByteWidth)} ] => ${hexit(rs, StateByteWidth)} ${hexit(rc, ColorByteWidth)} ${hexit(rt, TurnByteWidth)}`;
  };

  let eliding = 0;
  for (let k = 0; k < rules.length; k++) {
    if (rules[k] === 0) {
      switch (eliding++) {
        case 0:
          break;
        case 2:
          yield '...';
          continue;
        default:
          continue;
      }
    } else if (eliding) eliding = 0;
    yield fmt(k);
  }
  if (eliding > 1) yield fmt(rules.length - 1);

  /**
   * @param {number} n
   * @param {number} w
   */
  function hexit(n, w) {
    return n.toString(16).padStart(w * 2, '0');
  }
}

testActions.set('roundTrip', async function*({ stdin }) {
  const str1 = await bufferStream(stdin);

  const build1 = rezult.toValue(parseTurmite(str1));
  const code1 = build1.toString();
  yield 'first build:';
  yield code1;

  const ent = rezult.toValue(Turmite.from(build1));

  const str2 = ent.specString;

  yield `re - parsing ${str2}; `
  const build2 = rezult.toValue(parseTurmite(str2));
  const code2 = build2.toString();

  if (code1 !== code2) {
    yield* diff(
      [code1.split(/\n/), code2.split(/\n/)],
      [str1.split(/\n/), str2.split(/\n/)]);
  } else {
    yield 'round code trip okay:';
    yield code2;
    yield* dump(ent);
  }
});

/**
 * @param {string[][]} cols
 * @param {string[][]} [headCols]
 */
function* diff(cols, headCols) {
  let start = 0;
  if (headCols) {
    start = maxLength(headCols) + 1;
    for (let i = 0; i < headCols.length; i++) {
      const headCol = headCols[i];
      for (let j = headCol.length; j < start; j++) {
        headCol.unshift('');
      }
      headCol.push('');
      cols[i] = headCol.concat(cols[i]);
    }
  }

  const widths = cols.map(maxLength);
  const n = maxLength(cols);
  for (let i = 0; i < n; i++) {
    let out = '';
    for (let j = 0; j < cols.length; j++) {
      const line = cols[j][i].padEnd(widths[j]);
      const sep = (i > start && j > 0)
        ? cols[j - 1][i] === cols[j][i] ? '|' : 'X'
        : '   ';
      out += ` ${sep} ${line}`;
    }
    yield out;
  }
}

/** @param {{readonly length: number}[]} items */
function maxLength(items) {
  return items
    .map(({ length }) => length)
    .reduce((a, b) => Math.max(a, b));
}

/**
 * @param {Readable} stream
 * @param {BufferEncoding} [encoding]
 * @returns {Promise<string>}
 */
function bufferStream(stream, encoding = 'utf-8') {
  /** @type {Buffer[]} */
  const chunks = [];
  return new Promise((resolve, reject) => stream
    .on('data', chunk => chunks.push(Buffer.from(chunk)))
    .on('error', reject)
    .on('end', () => resolve(Buffer.concat(chunks).toString(encoding))));
}

/** @param {string[]} parts */
function message(...parts) {
  return { message: parts };
}

/** @param {string} str */
function terminate(str, end = '\n') {
  return str.endsWith(end) ? str : `${str}${end}`;
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}

/// main

import { promisify } from 'util';

const writeOut = promisify(process.stdout.write.bind(process.stdout));

try {
  for await (const out of runTestAction({
    stdin: process.stdin,
    args: process.argv.slice(2),
  })) {
    if (typeof out == 'string') {
      await writeOut(terminate(out));
    } else if ('log' in out) {
      console.log(...out.log);
    } else assertNever(out, 'invalid out data');
  }
} catch (/** @type {any} */ o) {
  if (typeof o == 'object' && 'message' in o) {
    const { message: mess } = o;
    if (Array.isArray(mess)) {
      for (const part of mess) {
        console.log(part);
      }
    } else console.log(mess);
  } else throw o;
}
