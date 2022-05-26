// @ts-check

import { OddQOffset } from '../coord.js';
import * as rezult from '../rezult.js';

import * as constants from './constants.js';

import { isAnt, convertAnt } from './parse.js';

/** @param {string} spec */
export function* ruleHelp(spec) {
  if (isAnt(spec)) yield* help.ant();
  else yield* help.turmite();
}

/** @type {{[topic: string]: () => Iterable<string>}} */
const help = {

  *ant() {
    yield 'ant(<number>?<turn> ...) , turns:';
    yield '  - L=left, R=right';
    yield '  - B=back, F=forward';
    yield '  - P=port, S=starboard (these are rear-facing left/right)';
  },

  *turmite() {
    yield 'Here Be Dragons'; // TODO provide online turmite help
    yield '';
    yield 'See README for full turmite language details.';
  },

};

/**
 * @param {string} spec
 * @returns {Generator<{name: string, label?: string, then: (spec: string) => string}>}
 */
export function* ruleActions(spec) {
  if (isAnt(spec)) {
    yield {
      name: 'liftToTurmite',
      label: 'Convert To Turmite',
      then: spec => convertAnt(spec),
    };
  }
}

export { default as parse } from './parse.js';

/** @typedef {import('./compile.js').RuleConstants} RuleConstants */
import parse from './parse.js';

/** @typedef {import('./compile.js').Builder} Builder */

export class Turmite {

  static TestSpec = {
    MaxColor: 0xff,
    MaxState: 0xff,
    MaxTurn: 0xffff,

    MaskResultState: 0xff000000,
    MaskResultColor: 0x00ff0000,
    MaskResultTurn: 0x0000ffff,

    ColorShift: 8,
    TurnShift: 16,

    // TODO: these are non-standard currently, but should be standardized
    //       starting here to not hardcode below in dump()

    ColorByteWidth: 1,
    StateByteWidth: 1,
    TurnByteWidth: 2,

    ResultByteWidth: 4,
    ResultStateShift: 24,
    ResultColorShift: 16,
    ResultTurnShift: 0,

    KeyByteWidth: 2,
    KeyStateMask: 0xff00,
    KeyColorMask: 0x00ff,
    KeyColorShift: 0,
    KeyStateShift: 8,
  };

  /**
   * @param {string|Builder} arg
   * @param {RuleConstants} [spec]
   * @param {Turmite} [ent]
   * @returns {rezult.Result<Turmite>}
   */
  static from(arg, spec = Turmite.TestSpec, ent = new Turmite()) {
    if (typeof arg === 'string') {
      const { value, err: parseErr } = parse(arg);
      if (parseErr) {
        return rezult.error(parseErr);
      }
      arg = value;
    }

    ent.reset();
    ent.rules.fill(0);

    const { value: built, err: buildErr } = arg(ent.rules, spec);
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

      // TODO get XXX constants from a spec: RuleConstants arg
      const color = datum & 0x00ff; // XXX World.MaskColor
      const flags = datum & 0xff00; // XXX World.MaskFlags
      const ruleIndex = state << 8 | color; // XXX World.ColorShift
      const rule = rules[ruleIndex];
      const turn = rule & 0x0000ffff; // XXX World.MaskResultTurn
      const write = (rule & 0x00ff0000) >> 16; // XXX &World.MaskResultColor >>World.TurnShift
      state = (rule & 0xff000000) >> 24; // XXX World.MaskResultState >>(World.TurnShift+World.ColorShift)
      datum = flags | write | 0x0100; // XXX World.FlagVisited

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

import { parseRaw } from './parse.js';
import { compileCode, endLines as addLineEnds } from './compile.js';

/**
 * @param {string} str
 * @param {object} [options]
 * @param {boolean} [options.endLines]
 * @param {import('./compile.js').CodeFormat} [options.format]
 */
export function compile(str, {
  endLines = false,
  format = 'value',
} = {}) {
  const spec = rezult.toValue(parseRaw(str));
  const lines = compileCode(spec, { format });
  return endLines ? addLineEnds(lines) : lines;
}
