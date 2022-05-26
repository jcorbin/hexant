// @ts-check

// @ts-ignore
import nearley from 'nearley';

import grammarRules from './grammar_rules.js';
const grammar = nearley.Grammar.fromCompiled(grammarRules);

import compile from './compile.js';
/** @typedef {import('./compile.js').Rules} Rules */
/** @typedef {import('./compile.js').RuleConstants} RuleConstants */

/** @typedef {import('./grammar.js').Node} Node */

import * as rezult from '../rezult.js';

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
export default function parse(str) {
  const parseRes = rezult.bind(parseRaw(str), node => node.type === 'spec'
    ? rezult.just(node)
    : rezult.error(new Error(
      `expected a "spec" grammar node, got a ${JSON.stringify(node.type)} node instead` +
      `; tried to parse only a fragment of a turmite spec?`)));
  const compileRes = rezult.bind(parseRes, spec => compile(spec));
  // TODO make compile => Result<Builder> directly
  return rezult.bind(compileRes, fn => rezult.just(/** @type {Builder} */(fn)));
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

/** @param {string} str */
export function parseRaw(str) {
  if (typeof str !== 'string') {
    return rezult.error(new Error('invalid argument, not a string'));
  }
  return rezult.catchErr(() => {
    const parser = new nearley.Parser(grammar);
    parser.feed(str);

    /** @type {{ results: Node[] }} */
    const { results } = parser;
    switch (results.length) {
      case 0:
        return rezult.error(new Error('no parse result'));
      case 1:
        return rezult.just(results[0]);
      default:
        return rezult.error(new Error('ambiguous parse'));
    }
  });
}
