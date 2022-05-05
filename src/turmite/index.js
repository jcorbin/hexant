// @ts-check

'use strict';

import { OddQOffset } from '../coord.js';
import * as rezult from '../rezult.js';

import * as constants from './constants.js';

export function* ruleHelp() {
  // TODO make this interactive by taking an input argument
  yield 'ant(<number>?<turn> ...) , turns:'
  yield '  - L=left, R=right'
  yield '  - B=back, F=forward'
  yield '  - P=port, S=starboard (these are rear-facing left/right)'
  yield ''
  yield 'See README for full turmite language details.'
}

export { default as parse } from './parse.js';

/** @typedef {import('./lang/compile.js').RuleConstants} RuleConstants */
import parse from './parse.js';

export class Turmite {

  /**
   * @param {RuleConstants} ruleSpec
   * @param {string} str
   * @param {Turmite} [ent]
   * @returns {rezult.Result<Turmite>}
   */
  static from(ruleSpec, str, ent = new Turmite()) {
    const { value: build, err: parseErr } = parse(str);
    if (parseErr) {
      return rezult.error(parseErr);
    }

    ent.reset();
    this.rules = new Uint32Array(256 * 256);

    const { value: built, err: buildErr } = build(ent.rules, ruleSpec);
    if (buildErr) {
      return rezult.error(buildErr);
    }

    const { numColors, numStates, specString } = built;
    ent.numColors = numColors;
    ent.numStates = numStates;
    ent.specString = specString;

    return rezult.just(ent);
  }

  constructor() {
    this.numStates = 0;
    this.numColors = 0;
    this.specString = '<null turmite>';
    this.rules = new Uint32Array(256 * 256);
    this.dir = 0;
    this.pos = new OddQOffset(0, 0);
    this.state = 0;
    this.index = 0;
  }

  reset() {
    this.dir = 0;
    this.pos.scale(0);
    this.state = 0;
  }

  toString() {
    return this.specString || '<UNKNOWN turmite>';
  }

  /** @typedef {object} World
   * @prop {(index: number, fn: (dir: number, state: number, datum: number) => {dir: number, state: number, datum: number}) => void} updateEnt
   */

  /** @param {World} world */
  step(world) {
    const { rules, index } = this;
    world.updateEnt(index, (dir, state, datum) => {

      // TODO use constants rather than these hardcodes
      const color = datum & 0x00ff;
      const flags = datum & 0xff00;
      const ruleIndex = state << 8 | color;
      const rule = rules[ruleIndex];
      const turn = rule & 0x0000ffff;
      const write = (rule & 0x00ff0000) >> 16;
      state = (rule & 0xff000000) >> 24;
      datum = flags | write | 0x0100;

      const newDirs = [...constants.turnDirs(turn, dir)];
      switch (newDirs.length) {
        case 0:
          break;
        case 1:
          dir = newDirs[0];
          break;
        default:
          throw new Error('turmite forking unimplemented');
      }

      return { dir, state, datum };
    });
  }
}
