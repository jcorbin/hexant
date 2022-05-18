// @ts-check

import { OddQOffset } from '../coord.js';
import * as rezult from '../rezult.js';

import * as constants from './constants.js';

import { isAnt, convertAnt } from './parse.js';

/** @param {string} spec */
export function* ruleHelp(spec) {
  if (isAnt(spec)) {
    yield 'ant(<number>?<turn> ...) , turns:';
    yield '  - L=left, R=right';
    yield '  - B=back, F=forward';
    yield '  - P=port, S=starboard (these are rear-facing left/right)';
  } else {
    yield 'Here Be Dragons'; // TODO provide online turmite help
    yield '';
    yield 'See README for full turmite language details.';
  }
}

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

/** @typedef {import('./lang/compile.js').RuleConstants} RuleConstants */
import parse from './parse.js';

/** @typedef {import('./parse.js').Builder} Builder */

export class Turmite {

  static TestSpec = {
    MaxColor: 0xff,
    MaxState: 0xff,
    MaxTurn: 0xffff,

    MaskResultColor: 0xff000000,
    MaskResultState: 0x00ff0000,
    MaskResultTurn: 0x0000ffff,

    ColorShift: 8,
    TurnShift: 16,

    // TODO: these are non-standard currently, but should be standardized
    //       starting here to not hardcode below in dump()

    ColorByteWidth: 1,
    StateByteWidth: 1,
    TurnByteWidth: 2,

    ResultByteWidth: 4,
    ResultColorShift: 24,
    ResultStateShift: 16,
    ResultTurnShift: 0,

    KeyByteWidth: 2,
    KeyColorMask: 0x00ff,
    KeyStateMask: 0xff00,
    KeyColorShift: 0,
    KeyStateShift: 1,
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

import { raw as parseRaw } from './lang/parse.js';
import { compileCode, endLines as addLineEnds } from './lang/compile.js';

/**
 * @param {string} str
 * @param {object} [options]
 * @param {boolean} [options.endLines]
 * @param {import('./lang/compile.js').CodeFormat} [options.format]
 */
export function compile(str, {
  endLines = false,
  format = 'value',
} = {}) {
  const parseRes = rezult.bind(parseRaw(str), ast => ast.type === 'spec'
    ? rezult.just(ast)
    : rezult.error(new Error(`unexpected type:${ast.type} node`)));
  const spec = rezult.toValue(parseRes);
  const lines = compileCode(spec, { format });
  return endLines ? addLineEnds(lines) : lines;
}
