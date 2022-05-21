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

// test more complicated turmites
for (const { name, input, expected } of [

  {
    name: 'color halver',
    input: '0, 2 * c => 0, c, turns(L R)[2 * c]',
    expected: {
      numColors: 2,
      numStates: 1,
      rules: imap(genn(256), /** @returns {RuleTuple} */ color =>
        color % 2 == 0
          ? [0, color, 0, Math.floor(color / 2), Turn.RelLeft]
          : [0, color, 0, 0, 0]
        // [0, 0, 0, 0, Turn.RelLeft],
        // [0, 1, 0, 0, 0],
        // [0, 2, 0, 1, Turn.RelLeft],
        // [0, 3, 0, 0, 0],
        // [0, 4, 0, 2, Turn.RelLeft],
        // [0, 5, 0, 0, 0],
        // ...
      ),
    },
  },

  {
    name: 'just 3n+1',
    input: '0, c => 0, 3 * c + 1, turns(L R)[c]',
    expected: {
      numColors: 2,
      numStates: 1,
      rules: imap(genn(256), /** @returns {RuleTuple} */ color =>
        [0, color, 0, (3 * color + 1) % 0x100, color % 2 == 0 ? Turn.RelLeft : Turn.RelRight],
        // [0, 0, 0, 1, Turn.RelLeft],
        // [0, 1, 0, 4, Turn.RelRight],
        // [0, 2, 0, 7, Turn.RelLeft],
        // [0, 3, 0, 10, Turn.RelRight],
        // ...
      ),
    },
  },

  {
    name: 'collatz colors',
    input: [
      'Turns = turns(L R)',
      '0, c => 0, 3 * c + 1, Turns[c]',
      '0, 2 * c => 0, c, Turns[2 * c]',
    ],
    expected: {
      numColors: 2,
      numStates: 1,
      rules: imap(genn(256), /** @returns {RuleTuple} */ color =>
        color % 2 == 0
          ? [0, color, 0, Math.floor(color / 2), Turn.RelLeft]
          : [0, color, 0, (3 * color + 1) % 0x100, Turn.RelRight],
        // [0, 0, 0, 0, Turn.RelLeft],
        // [0, 1, 0, 4, Turn.RelRight],
        // [0, 2, 0, 1, Turn.RelLeft],
        // [0, 3, 0, 10, Turn.RelRight],
        // [0, 4, 0, 2, Turn.RelLeft],
        // [0, 5, 0, 16, Turn.RelRight],
        // ...
      ),
    },
  },

  {
    name: 'collatz colors (moar colors)',
    input: [
      '@numColors 256',
      'Turns = turns(L R)',
      '0, c => 0, 3 * c + 1, Turns[c]',
      '0, 2 * c => 0, c, Turns[2 * c]',
    ],
    expected: {
      numColors: 256,
      numStates: 1,
      rules: imap(genn(256), /** @returns {RuleTuple} */ color =>
        color % 2 == 0
          ? [0, color, 0, Math.floor(color / 2), Turn.RelLeft]
          : [0, color, 0, (3 * color + 1) % 0x100, Turn.RelRight],
        // [0, 0, 0, 0, Turn.RelLeft],
        // [0, 1, 0, 4, Turn.RelRight],
        // [0, 2, 0, 1, Turn.RelLeft],
        // [0, 3, 0, 10, Turn.RelRight],
        // [0, 4, 0, 2, Turn.RelLeft],
        // [0, 5, 0, 16, Turn.RelRight],
        // ...
      ),
    },
  },

]) test(name, t => canTurmite(t, input, expected));

/** @typedef {string|string[]} TestInput */

/** @typedef {[keyState: number, keyColor: number, state: number, color: number, turn: number]} RuleTuple */

/** @typedef {object} ExpectOpts
 * @prop {boolean} verbose
 * @prop {boolean|import('../src/turmite/lang/compile.js').CodeFormat} logCode
 */

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
 * @param {Partial<ExpectProps & ExpectOpts>} expected
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
 * @param {Partial<{input: TestInput} & ExpectProps & ExpectOpts>} expected
 */
function isTurmite(t, ent, { input, numColors, numStates, rules, verbose, logCode }) {

  if (input !== undefined) t.is(
    ent.toString().trim(),
    (Array.isArray(input) ? input.join('\n') : input).trim(),
    'input vs specString (canonical)');
  if (verbose || logCode) {
    const spec = ent.toString().trimEnd();
    const lines = spec.split(/\n/);
    if (lines.length < 2) {
      t.log('spec', spec);
    } else {
      t.log('spec: ```turmite');
      for (const line of lines) {
        t.log(line);
      }
      t.log('```');
    }
  }

  if (logCode) {
    const format = typeof logCode === 'string' ? logCode : 'module';
    t.log(`recompiled: ${'```'}javascript ${format}`);
    for (const line of compile(ent.toString(), { format })) {
      t.log(line);
    }
    t.log('```');
  }

  if (numColors !== undefined) t.is(ent.numColors, numColors, 'numColors');
  if (verbose) t.log('numColors', ent.numColors);

  if (numStates !== undefined) t.is(ent.numStates, numStates, 'numStates');
  if (verbose) t.log('numStates', ent.numStates);

  for (const [keyState, keyColor, state, color, turn] of rules) {
    const key = keyState << 8 | keyColor;
    const actualRule = hexrule(decodeRule(ent.rules[key]));
    const expectRule = hexrule({ state, color, turn });
    const desc = `rules[${hexkey(key)}]`;
    t.deepEqual(actualRule, expectRule, desc);
    if (verbose) {
      t.log(`${desc} ${presentRule(actualRule)}`);
    }
  }

  /** @param {{state: number, color: number, turn: string}} r */
  function presentRule({ state, color, turn }) {
    return [
      `state:${state.toString().padEnd(3)}`,
      `color:${color.toString().padEnd(3)}`,
      `turn:${turn}`
    ].join(' ');
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
