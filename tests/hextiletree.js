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
  test(`grow(${i})`, t => {
    const scene = new TestScene(t, origin, 1, 1);

    /** @type {Array<(scene: TestScene) => void>} */
    const plan = [
      scene => scene.check([[0]]),
      scene => scene.set(origin, 1),
      scene => scene.check([[1]])
    ];

    for (let n = 1; n <= 3; n++) {
      const N = Math.pow(2, n);

      const expected = zeros(N);
      const row = expected[(N + origin.r) % N];
      row[(N + origin.q) % N] = 1;

      plan.push(
        scene => scene.grow(i),
        scene => scene.check(expected));
    }

    for (const step of plan) {
      step(scene);
      // console.log(ctx.tile.dump());
    }
  });

});

class TestScene {
  /** @type {OddQHexTile|HexTileTreeNode} */
  tile = new OddQHexTile();

  /**
   * @param {import('ava').ExecutionContext} t
   * @param {oddQPotent} origin
   * @param {number} width
   * @param {number} height
   */
  constructor(t, origin, width, height) {
    this.t = t;
    this.tile = new OddQHexTile();
    this.tile.init(origin, width, height);
  }

  /**
   * @param {oddQPotent} point
   * @param {number} value
   */
  set(point, value) {
    this.tile.set(point, value);
  }

  /**
   * @param {number} i
   */
  grow(i) {
    this.tile = growTile(null, this.tile, i);
  }

  /**
   * @param {number[][]} expected
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
  }

}

/** @param {any} arg @returns {string} */
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
