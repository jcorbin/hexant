// @ts-check

import test from 'ava';

import { Turn } from '../src/turmite/constants.js';
import { Turmite, compile } from '../src/turmite/index.js';

// test basic ants
for (const { name, input, expected } of [

  {
    name: 'basic LR',
    input: 'ant(L R)',
    expected: {
      numColors: 2,
      numStates: 1,
      rules: imap(genn(256), /** @returns {RuleTuple} */ color => [
        // [0, Turn.RelLeft, 1]
        // [1, Turn.RelRight, 2]
        // ...
        // [254, Turn.RelLeft, 255]
        // [255, Turn.RelRight, 0]
        0, color,
        0, (color + 1) % 256,
        color % 2 ? Turn.RelRight : Turn.RelLeft,
      ]),
    },
  },

]) test(name, t => canTurmite(t, input, expected));

// test basic turmites vs equivalent ants
for (const { name, input, equiv } of [

  {
    name: 'basic RL',
    input: '0, c => 0, c + 1, turns(R L)[c]',
    equiv: 'ant(R L)',
  },

  {
    name: 'RL w/ assign',
    input: [
      'Turns = turns(R L)',
      '0, c => 0, c + 1, Turns[c]',
    ],
    equiv: 'ant(R L)',
  },

]) test(`equivalant: ${name} `, t => {
  const { err, value } = Turmite.from(equiv);
  if (!t.falsy(err)) return;
  canTurmite(t, input, equivProps(value));
});

/** @typedef {string|string[]} TestInput */

/** @typedef {[keyState: number, keyColor: number, state: number, color: number, turn: number]} RuleTuple */

/** @typedef {object} ExpectProps
 * @prop {number} numColors
 * @prop {number} numStates
 * @prop {Iterable<RuleTuple>} rules
 */

/**
 * @param {Turmite} ent
 * @returns {ExpectProps}
 */
function equivProps(ent) {
  const { numColors, numStates, rules } = ent;
  return {
    numColors,
    numStates,
    rules: imap(rules, /** @returns {RuleTuple} */(rule, key) => {
      const { keyState, keyColor } = decodeKey(key);
      const { state, color, turn } = decodeRule(rule);
      return [keyState, keyColor, state, color, turn];
    }),
  };
}

/**
 * @param {import('ava').ExecutionContext<unknown>} t
 * @param {TestInput} input
 * @param {Partial<ExpectProps>} expected
 */
function canTurmite(t, input, expected) {
  const spec = Array.isArray(input) ? input.join('\n') : input;
  const { err, value } = Turmite.from(spec);
  if (t.falsy(err)) isTurmite(t, value, { input, ...expected });
  if (!t.passed) {
    for (const line of compile(spec, { format: 'module' })) {
      t.log(line);
    }
  }
}

/**
 * @param {import('ava').ExecutionContext<unknown>} t
 * @param {Turmite} ent
 * @param {Partial<{input: TestInput} & ExpectProps>} expected
 */
function isTurmite(t, ent, { input, numColors, numStates, rules }) {
  if (input !== undefined) t.is(
    ent.toString().trim(),
    (Array.isArray(input) ? input.join('\n') : input).trim(),
    'input vs specString (canonical)');
  if (numColors !== undefined) t.is(ent.numColors, numColors, 'numColors');
  if (numStates !== undefined) t.is(ent.numStates, numStates, 'numStates');
  for (const [keyState, keyColor, state, color, turn] of rules) {
    const key = keyState << 8 | keyColor;
    t.deepEqual(
      hexrule(decodeRule(ent.rules[key])),
      hexrule({ state, color, turn }),
      `rules[${hexkey(key)}]`);
  }
}


/** @param {number} key */
function hexkey(key) {
  const { keyColor, keyState } = decodeKey(key);
  return `${hexit(4, key)} state:${keyState} color:${keyColor}`
}

/** @param {object} tcs
 * @param {number} tcs.turn
 * @param {number} tcs.color
 * @param {number} tcs.state
 */
function hexrule({ turn, color, state }) {
  return { state, color, turn: hexit(4, turn) };

}

/** @param {number} key */
function decodeKey(key) {
  const keyColor = key & 0xff;
  const keyState = (key >> 8) & 0xff;
  return { keyColor, keyState };
}

/** @param {number} rule */
function decodeRule(rule) {
  const turn = rule & 0xffff;
  const color = (rule >> 16) & 0xff;
  const state = (rule >> 24) & 0xff;
  return { turn, color, state };
}

/**
 * @param {number} n
 * @param {number} [start]
 */
function* genn(n, start = 0) {
  const end = start + n;
  while (start < end) {
    yield start++;
  }
}

/**
 * @param {number} n
 * @param {number} val
 */
function hexit(n, val) {
  return `0x${val.toString(16).padStart(n, '0')}`
}

/** @template T, V
 * @param {Iterable<T>} it
 * @param {(t: T, i: number) => V} fn
 */
function* imap(it, fn) {
  let i = 0;
  for (const item of it) {
    yield fn(item, i++);
  }
}
