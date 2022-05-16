// @ts-check

import test from 'ava';

import { Turn } from '../src/turmite/constants.js';
import { Turmite, compile } from '../src/turmite/index.js';

// test basic ants
for (const { name, input, expected: { numColors, numStates, rules } } of [

  {
    name: 'basic LR',
    input: 'ant(L R)',
    expected: {
      numColors: 2,
      numStates: 1,
      rules: [
        // [0, Turn.RelLeft, 1],
        // [1, Turn.RelRight, 2],
        // ...
        // [254, Turn.RelLeft, 255],
        // [255, Turn.RelRight, 0],
        ...genn(256)].map(i => [
          i,
          i % 2 ? Turn.RelRight : Turn.RelLeft,
          (i + 1) % 256
        ]),
    },
  },

]) test(name, t => {
  const { err, value: ent } = Turmite.from(input);
  if (t.falsy(err)) {
    t.is(ent.toString(), input);
    t.is(ent.numColors, numColors);
    t.is(ent.numStates, numStates);
    for (const [key, turn, color] of rules) {
      const state = 0; // ants are stateless
      const rule = ent.rules[key];
      const ruleTurn = rule & 0xffff;
      const ruleColor = (rule >> 16) & 0xff;
      const ruleState = (rule >> 24) & 0xff;
      t.is(
        hexit(4, ruleTurn), hexit(4, turn),
        `rules[${hexit(key, 4)}] -> turn`);
      t.is(
        hexit(2, ruleColor), hexit(2, color),
        `rules[${hexit(key, 4)}] -> color`);
      t.is(
        hexit(2, ruleState), hexit(2, state),
        `rules[${hexit(key, 4)}] -> state`);
    }
  }
});

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
  const inStr = Array.isArray(input) ? input.join('\n') : input;
  const { err: entErr, value: ent } = Turmite.from(inStr);
  const { err: eqvErr, value: eqv } = Turmite.from(equiv);
  if (t.falsy(entErr) && t.falsy(eqvErr)) {
    t.is(ent.toString().trim(), inStr);
    t.is(ent.numColors, eqv.numColors, 'numColors');
    t.is(ent.numStates, eqv.numStates, 'numStates');
    for (let key = 0; key < ent.rules.length; key++) t.deepEqual(
      hexem(decodeRule(ent.rules[key])),
      hexem(decodeRule(eqv.rules[key])),
      `rules[${hexkey(key)}]`);
  }

  if (!t.passed) {
    for (const line of compile(inStr, { format: 'module' })) {
      t.log(line);
    }
  }

});

/** @param {number} key */
function hexkey(key) {
  const { color: keyColor, state: keyState } = decodeKey(key);
  return `state:${hexit(keyState, 2)} color:${hexit(keyColor, 2)}`
}

/** @param {object} tcs
 * @param {number} tcs.turn
 * @param {number} tcs.color
 * @param {number} tcs.state
 */
function hexem({ turn, color, state }) {
  return {
    turn: hexit(4, turn),
    color: hexit(2, color),
    state: hexit(2, state),
  };

}

/** @param {number} key */
function decodeKey(key) {
  const color = key & 0xff;
  const state = (key >> 8) & 0xff;
  return { color, state };
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
