// @ts-check

import * as rezult from '../rezult.js';

// TODO custom recursive descent parser
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
  return rezult.bind(parseLang(str), fn =>
    rezult.just(/** @type {Builder} */(fn)));
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
