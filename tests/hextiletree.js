// @ts-check

import test from 'ava';

import { OddQOffset } from '../src/coord.js';
import { OddQHexTile } from '../src/hextile.js';
import { growTile } from '../src/hextiletree.js';

/** @typedef {import('../src/hextile.js').oddQPotent} oddQPotent */
/** @typedef {import('../src/hextiletree.js').HexTileTreeNode} HexTileTreeNode */

[
  new OddQOffset(-1, -1),
  new OddQOffset(0, -1),
  new OddQOffset(-1, 0),
  new OddQOffset(0, 0)
].forEach((origin, i) => {

  const plan = [
    ['initTile', origin, 1, 1],
    ['check', [[0]]],
    ['set', origin, 1],
    ['check', [[1]]]
  ];

  for (let n = 1; n <= 3; n++) {
    const N = Math.pow(2, n);

    const expected = zeros(N);
    const row = expected[(N + origin.r) % N];
    row[(N + origin.q) % N] = 1;

    plan.push(
      ['grow', i],
      ['check', expected]);
  }

  test(`grow(${i})`, t => {
    const ctx = { t, tile: null };
    for (const step of plan) {
      // assert.comment(disp(step));
      Actions[step[0]].apply(ctx, step.slice(1));
      // console.log(ctx.tile.dump());
    }
  });

});

/** @typedef {object} Context
 * @prop {import('ava').ExecutionContext} t
 * @prop {null|OddQHexTile|HexTileTreeNode} tile
 */

const Actions = {

  /**
   * @param {oddQPotent} origin
   * @param {number} width
   * @param {number} height
   * @this {Context}
   */
  initTile(origin, width, height) {
    this.tile = new OddQHexTile();
    this.tile.init(origin, width, height);
  },

  /**
   * @this {Context}
   * @param {oddQPotent} point
   * @param {number} value
   */
  set(point, value) {
    this.tile.set(point, value);
  },

  /**
   * @param {number} i
   * @this {Context}
   */
  grow(i) {
    this.tile = growTile(null, this.tile, i);
  },

  /**
   * @param {number[][]} expected
   * @this {Context}
   */
  check(expected) {
    const topLeft = this.tile.boundingBox().topLeft;
    /** @type {number[][]} */
    const out = [];
    this.tile.eachDataPoint((point, d) => {
      const q = point.q - topLeft.q;
      const r = point.r - topLeft.r;
      const row = out[r] || (out[r] = []);
      row[q] = d;
    }, 0);

    this.t.deepEqual(out, expected, `expected ${disp(expected)}`);
  },

};

/** @param {any} arg */
function disp(arg) {
  if (Array.isArray(arg)) {
    return `[${arg.map(disp).join(' ')}]`;
  }
  return arg.toString();
}

/** @param {number} N */
function zeros(N) {
  /** @type {number[][]} */
  const ar = [];
  for (let i = 0; i < N; i++) {
    ar[i] = [];
    for (let j = 0; j < N; j++) {
      ar[i][j] = 0;
    }
  }
  return ar;
}
