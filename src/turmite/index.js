// @ts-check

import { OddQOffset } from '../coord.js';
import * as rezult from '../rezult.js';

import * as constants from './constants.js';

import parseRaw from './parse.js';
import toSpecString from './tostring.js';

import {
  default as compileBuilder,
  compileCode, endLines as addLineEnds
} from './compile.js';

/** @typedef {import('./compile.js').RuleConstants} RuleConstants */
/** @typedef {import('./compile.js').Builder} Builder */

import { actions, isJustAnt } from './analyze.js';

/**
 * @param {string} str
 * @returns {Generator<{name: string, label?: string, then: (spec: string) => string}>}
 */
export function* ruleActions(str) {
  const { value: spec } = parseRaw(str);
  if (!spec) return;
  for (const { then, ...action } of actions(spec)) yield {
    ...action, then(str) {
      const { value: spec } = parseRaw(str);
      if (!spec) return str;
      const newSpec = then(spec);
      return [...toSpecString(newSpec)].join('\n');
    }
  };
}

/** @param {string} spec */
export function* ruleHelp(spec) {
  if (isJustAnt(spec)) yield* help.ant();
  else yield* help.turmite();
}

/** @type {{[topic: string]: () => Iterable<string>}} */
const help = {

  *ant() {
    yield '# Basic Ant Rule Format'
    yield '';
    yield '    ant(<number>?<turn>...)';
    yield '';
    yield 'Each <turn> may be one of:';
    yield '  - L=left, R=right';
    yield '  - B=back, F=forward';
    yield '  - P=port, S=starboard (these are rear-facing left/right)';
    yield '';
    yield '## Examples';
    yield '';
    yield '    ant( R L )';
    yield '    ant( 2L 13R 2L )';
    yield '    ant( 2L 13R 2L 42F )';
  },

  *turmite() {
    yield '# Turmite Rule Format';
    yield '';
    yield 'The basic turmite rule form is:';
    yield '    <when> => <then>';
    yield '';
    yield 'Where <when> has the form:';
    yield '    <state>, <color>';
    yield 'The state> and <color> are simple numeric (uint8) expressions that match against the world tile color (uint8) and internal turmite state (uint8).';
    yield 'For example, a <color> term of 2*c only matches even colors';
    yield '';
    yield 'Similarly <then> has the form:';
    yield '    <state>, <color>, <turn>';
    yield '';
    yield '- <turn> may be one of L, R, F, B, P, or S as to an ant(...) rule';
    yield '  - additonal absolute directions are supported: NW, NO, NE, SE, SO, and SW';
    yield '- <turn> may also be an indexed turns(...)[INDEX] expression';
    yield '- right hand side expressions may reference symbols matched on the left';
    yield '  - e.g. the basic ant(...) construction translates to 0, c => 0, c + 1 turns(...)[c]';
    yield '- finally, variable assignments may precede rules, to define things like a turn sequence for use in multiple places';
    yield '';
    yield '## Examples';
    yield '';
    yield 'To make a bi-modal ant that switches between LR / RL rules on every 16-th color:';
    yield '    0, c => 0, c + 1, turns(L R)[c]'
    yield '    1, c => 1, c + 1, turns(R L)[c]'
    yield '    0, 16 * c - 1 => 1, _, _'
    yield '    1, 16 * c - 1 => 0, _, _'
  },

};

/** @param {string} str */
export function parse(str) {
  return rezult.bind(parseRaw(str), spec => compileBuilder(spec));
}

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

/**
 * @param {string} str
 * @param {object} [options]
 * @param {boolean} [options.endLines]
 * @param {import('./compile.js').CodeFormat} [options.format]
 */
export function compile(str, options = {}) {
  const { endLines = false, format = 'value' } = options;
  const spec = rezult.toValue(parseRaw(str));
  const lines = compileCode(spec, { format });
  return endLines ? addLineEnds(lines) : lines;
}
