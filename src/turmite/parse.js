// @ts-check

// @ts-ignore
import nearley from 'nearley';

import * as rezult from '../rezult.js';

import grammarRules from './grammar_rules.js';
const grammar = nearley.Grammar.fromCompiled(grammarRules);

import { isNodeType } from './grammar.js';

/** @typedef {import('./grammar.js').Node} Node */
/** @typedef {import('./grammar.js').NodeType} NodeType */
/** @template T @typedef {import('./grammar.js').TypedNode<T>} TypedNode */

/**
 * @template {NodeType} T
 * @param {T} type
 * @param {Node} node
 * @returns {TypedNode<T>}
 */
function asTypedNode(type, node) {
  if (!isNodeType(type, node)) throw new Error(
    `expected a ${JSON.stringify(type)} grammar node, ` +
    `got a ${JSON.stringify(type)} node`);
  return node;
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
export default function parse(str) {
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
        return rezult.just(asTypedNode('spec', results[0]));
      default:
        return rezult.error(new Error('ambiguous parse'));
    }
  });
}
