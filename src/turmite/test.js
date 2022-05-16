// @ts-check

'use strict';

import * as rezult from '../rezult.js';

import {
  parse as parseTurmite,
  Turmite,
} from './index.js';

/** @typedef {import('stream').Readable} Readable */

/** @typedef {object} TestCtx
 * @prop {Readable} stdin
 * @prop {string[]} args
 */

/** @callback TestAction
 * @param {TestCtx} ctx
 * @returns {AsyncIterableIterator<string>}
 */

/** @type {Map<string, TestAction>} */
const testActions = new Map();

/** @type {TestAction} */
async function* runTestAction({ args: [action, ...args], ...rest }) {
  const testAction = testActions.get(action);
  if (!testAction) {
    throw new Error(
      `invalid test action: ${action}; ` +
      `possible actions: ${[...testActions.keys()].sort().join(' ')} `
    );
  }
  for await (const line of testAction({ args, ...rest })) {
    const withNL = `${line}${line.endsWith('\n') ? '' : '\n'} `;
    yield withNL;
  }
}

testActions.set('diffRules', async function*({ args: [str1, str2] }) {
  const { rules: rules1, specString: spec1 } = await rezult.toPromise(Turmite.from(str1));
  const { rules: rules2, specString: spec2 } = await rezult.toPromise(Turmite.from(str2));
  yield spec1;
  yield '-- vs';
  yield spec2;
  yield* diff([
    Buffer.from(rules1.buffer).toString('hex').split(/\n/),
    Buffer.from(rules2.buffer).toString('hex').split(/\n/),
  ]);
});

testActions.set('dump', async function*({ stdin }) {
  const str = await bufferStream(stdin);

  const builder = await rezult.toPromise(parseTurmite(str));
  yield 'BUILDER:';
  yield builder.toString();

  yield* dump(await rezult.toPromise(Turmite.from(builder)));
});

/** @param {Turmite} ent */
function* dump(ent) {
  yield `numStates: ${ent.numStates}`;
  yield `numColors: ${ent.numColors}`;

  let first = true;
  for (const line of ent.specString.split(/\n/)) {
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
  yield `[ ${statePart} ${colorPart} ] => ${turnPart} ${colorPart} ${statePart} -- S:state C:color T:turn`;
  for (let i = 0; i < ent.rules.length; i++) {
    const result = ent.rules[i];
    const kc = i & KeyColorMask >> KeyColorShift;
    const ks = i & KeyStateMask >> KeyStateShift;
    const rt = (result & MaskResultTurn) >> ResultTurnShift;
    const rc = (result & MaskResultColor) >> ResultColorShift;
    const rs = (result & MaskResultState) >> ResultStateShift;
    yield `[ ${hexit(kc, ColorByteWidth)} ${hexit(ks, StateByteWidth)} ] => ${hexit(rt, TurnByteWidth)} ${hexit(rc, ColorByteWidth)} ${hexit(rs, StateByteWidth)}`;
  }

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

  const build1 = await rezult.toPromise(parseTurmite(str1));
  const code1 = build1.toString();
  yield 'first build:';
  yield code1;

  const ent = await rezult.toPromise(Turmite.from(build1));

  const str2 = ent.specString;

  yield `re - parsing ${str2}; `
  const build2 = await rezult.toPromise(parseTurmite(str2));
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

/// main

import { promisify } from 'util';

const writeOut = promisify(process.stdout.write.bind(process.stdout));

for await (const line of runTestAction({
  stdin: process.stdin,
  args: process.argv.slice(2),
})) await writeOut(line);
