// @ts-check

import * as rezult from '../rezult.js';

import parseLang from './lang/parse.js';
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

  let res = rezult.bind(parseLang(str), fn =>
    rezult.just(/** @type {Builder} */(fn)));

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
  // TODO replace this with use of analyze.antRule on a parsed node tree
  const match = /^\s*ant\(\s*(.+?)\s*\)\s*$/.exec(str);
  if (!match) throw new Error('invalid ant(...) string');
  const turns = match[1].trim();
  return `0, c => 0, c + 1, turns(${turns})[c]`;
}
