// @ts-check

import * as rezult from '../rezult.js';

import { from as rleFrom } from './rle-builder.js';
import * as constants from './constants.js';

import parseLang from './lang/parse.js';
/** @typedef {import('./lang/compile.js').Spec} Spec */
/** @typedef {import('./lang/compile.js').Rules} Rules */
/** @typedef {import('./lang/compile.js').RuleConstants} RuleConstants */

/** @callback Builder
 * @param {Rules} rules
 * @param {RuleConstants} ruleSpec
 * @returns {rezult.Result<Built>}
 */

/** @typedef {object} Built
 * @prop {number} numColors
 * @prop {number} numStates
 * @prop {string} specString
 */

// TODO replace lang.Spec entirely with Builder once we merge

/**
 * @param {string} str
 * @returns {rezult.Result<Builder>}
 */
export default function(str) {
  // TODO unified recursive descent parser
  const lines = str
    .split(/\n/)
    .map(/** @returns {{line: string} | {comment: string} | {prop: string, value: string}} */ line => {
      /** @type {RegExpExecArray|null} */
      let match;

      if (match = /^\s*--(.*)$/.exec(line))
        return { comment: match[1].trim() };

      if (match = /^\s*@(\w+)\s+(.+?)\s*$/.exec(line))
        return { prop: match[1], value: match[2] };

      return { line };
    });
  str = lines
    .map(ln => 'line' in ln ? `${ln.line}\n` : '')
    .join('');

  /** @param {string} propName */
  const hasProp = propName => lines
    .map(ln => 'prop' in ln && ln.prop === propName)
    .reduce((prior, has) => has || prior, false);

  /** @param {string} propName */
  const getProp = propName => lines
    .map(ln => 'prop' in ln && ln.prop === propName ? ln.value : '')
    .reduce((prior, value) => value || prior, '');

  /**
   * @param {string} propName
   * @param {rezult.Result<Builder>} res
   * @param {(builder: Builder, str: string) => rezult.Result<Builder>} fn
   * @returns {rezult.Result<Builder>}
   */
  const withProp = (propName, res, fn) => hasProp(propName)
    ? rezult.bind(res, builder => fn(builder, getProp(propName)))
    : res;

  /**
   * @param {string} propName
   * @param {rezult.Result<Builder>} res
   * @param {(builder: Builder, num: number) => rezult.Result<Builder>} fn
   * @returns {rezult.Result<Builder>}
   */
  const withNumericProp = (propName, res, fn) =>
    withProp(propName, res, (builder, str) => {
      const num = parseInt(str);
      return isNaN(num)
        ? rezult.error(new Error(`invalid @${propName} value ${JSON.stringify(str)}`))
        : fn(builder, num);
    });

  let res = (/** @returns {rezult.Result<Builder>} */() => {
    for (const parser of [
      parseAnt,
      parseTurmite,
    ]) {
      const res = parser(str);
      if (res.err) { return res }
      if (res.value) { return rezult.just(res.value) }
    }
    return rezult.error(new Error('invalid spec string'));
  })();

  res = withNumericProp('numColors', res,
    (builder, num) => rezult.just(
      (rules, spec) => rezult.bind(
        builder(rules, spec),
        ({ numColors, specString, ...built }) => {
          numColors = Math.min(256, Math.max(numColors, num));
          specString = `@numColors ${numColors}\n${specString}`;
          return rezult.just({ numColors, specString, ...built });
        })));

  return res;
}

/** @param {string} str */
export function isAnt(str) {
  // TODO better AST-based static analysis for interaction once we unify the
  // parser ant+turmite parsers
  return /^\s*ant(\(.*|\s*$)/.test(str);
}

/** @param {string} str */
export function convertAnt(str) {
  const match = /^\s*ant\(\s*(.+?)\s*\)\s*$/.exec(str);
  if (!match) throw new Error('invalid ant(...) string');
  const turns = match[1].trim();
  return `0, c => 0, c + 1, turns(${turns})[c]`;
}

/**
 * @param {string} str
 * @returns {rezult.Result<Builder|null>}
 */
function parseAnt(str) {
  // match any ant(TURNS)
  const antMatch = /^\s*ant\(\s*(.+?)\s*\)\s*$/.exec(str);
  if (!antMatch) {
    if (isAnt(str)) {
      return rezult.error(new Error('incomplete / invalid ant(...) string'));
    }
    // NOTE: not an error, allowing next parser (lang.parse) a chance
    return rezult.just(null);
  }
  str = antMatch[1];

  // convert legacy turn aliases
  const compatMatch = /^\s*([lrwefaLRWEFA]+)\s*$/.exec(str);
  if (compatMatch) {
    const antCompatMap = new Map([
      ['W', 'P'], // "west" meant "port"
      ['E', 'S'], // "east" meant "starboard"
      ['F', 'B'], // legacy... not sure how to make sense of this
      ['A', 'F'], // ...or this
    ]);
    str = Array
      .from(compatMatch[1].toUpperCase())
      .map(move => antCompatMap.get(move) || move)
      .join(' ');
  }

  str = str.toUpperCase();

  // tokenize [SPACE] [COUNT] TURN [SPACE]
  const re = /\s*\b(\d+)?(?:(B|P|L|F|R|S|NW|NO|NE|SE|SO|SW))\b\s*/g;
  let i = 0;
  /** @type {number[]} */
  const counts = [];
  /** @type {string[]} */
  const syms = [];
  for (
    let match = re.exec(str);
    match && i === match.index;
    i += match[0].length, match = re.exec(str)
  ) {
    const [_, count, turn] = match;
    counts.push(count ? parseInt(count, 10) : 1);
    syms.push(turn.toUpperCase());
  }
  if (i < str.length) {
    return rezult.error(new Error(
      `invalid ant string: ${JSON.stringify(str)}` +
      `; invalid input starts at [${i}]: ${JSON.stringify(str.slice(i))}`));
  }

  const numColors = counts.reduce((a, b) => a + b);
  const numStates = 1;
  const specString = `ant(${rleFrom(zip(counts, syms))
    .map(([count, sym]) => count > 1 ? `${count}${sym}` : sym)
    .join(' ')})`;

  /** @type {number[]} */
  const turns = [];
  for (const [count, turn] of zip(counts, syms.map(sym =>
    constants.RelSymbolTurns.get(sym) ||
    constants.AbsSymbolTurns.get(sym)))) {
    if (turn !== undefined) {
      for (let j = 0; j < count; j++) {
        turns.push(turn);
      }
    }
  }

  return rezult.just((rules, ruleSpec) => {
    const { MaxColor, TurnShift } = ruleSpec;
    if (numColors > MaxColor) {
      return rezult.error(new Error('too many colors needed for ant ruleset'));
    }
    for (let c = 0; c <= MaxColor; c++) {
      const turn = turns[c % turns.length];
      const color = c + 1 & MaxColor;
      rules[c] = color << TurnShift | turn;
    }
    return rezult.just({ numColors, numStates, specString });
  });
}

/**
 * @param {string} str
 * @returns {rezult.Result<Builder>}
 */
function parseTurmite(str) {
  const { value: spec, err } = parseLang(str);
  if (err) {
    return rezult.error(err);
  }
  return rezult.just((rules, ruleSpec) => {
    const { numColors, specString, build } = spec;
    // TODO push this back up the chain, and make lang.compile return a Builder
    const { MaxColor } = ruleSpec;
    if (numColors > MaxColor) {
      return rezult.error(new Error('too many colors needed for turmite ruleset'));
    }

    // TODO more checks like above once we unify into lang.compile
    const { states: { size: numStates } } = build(ruleSpec, rules);
    return rezult.just({ numColors, numStates, specString });
  });
}

/** @template A, B
 * @param {ArrayLike<A>} a
 * @param {ArrayLike<B>} b
 */
function* zip(a, b) {
  for (let i = 0; i < a.length && i < b.length; i++) {
    yield /** @type {[A, B]} */([a[i], b[i]]);
  }
}
