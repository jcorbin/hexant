// @ts-check

// @ts-ignore
import nearley from 'nearley';

import * as rezult from '../../rezult.js';

import compile from './compile.js';
import grammarRules from './grammar.js';

const grammar = nearley.Grammar.fromCompiled(grammarRules);

/** @param {string} str */
export default function(str) {
  return rezult.bind(
    rezult.catchErr(() => {
      if (typeof str !== 'string') {
        return rezult.error(new Error('invalid argument, not a string'));
      }
      /** @typedef {import('./walk.js').Node} Node */
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
    }),
    node => {
      switch (node.type) {
        case 'spec':
          return compile(node);
        default:
          return rezult.error(new Error(
            `expected a "spec" grammar node, got a "${node.type}" node instead` +
            `; tried to parse only a fragment of a turmite spec?`));
      }
    });
}
