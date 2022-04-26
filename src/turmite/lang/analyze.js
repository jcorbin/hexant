// @ts-check

'use strict';

import * as rezult from '../../rezult.js';
import * as walk from './walk.js';

/** @typedef {object} analysis
 * @prop {number} maxTurns
 */

/**
 * @param {walk.SpecNode} spec
 * @param {Set<string>} symbols
 * @returns {rezult.Result<analysis>}
 */
export function analyze(spec, symbols) {
  let maxTurns = 0;

  for (const { id: { name } } of spec.assigns) {
    if (symbols.has(name)) {
      return rezult.error(new Error(`redefinition of special symbol ${name}`));
    }
    symbols.add(name);
  }

  /**
   * @param {walk.AnyExpr} value
   * @returns {walk.IdentifierNode}
   */
  function assign(value) {
    const name = gensym(value.type, symbols);
    symbols.add(name);
    spec.assigns.push({
      type: 'assign',
      id: { type: 'identifier', name },
      value,
    });
    each(value); // since dfs will no longer visit the value
    return { type: 'identifier', name };
  }

  walk.dfsPre(spec, each);

  /** @param {walk.Node} node */
  function each(node) {
    switch (node.type) {
      case 'assign':
        symbols.add(node.id.name);
        break;

      case 'member':
        switch (node.value.type) {
          case 'symbol':
          case 'identifier':
            break;
          default:
            node.value = assign(node.value);
        }
        break;

      case 'turns':
        maxTurns = Math.max(maxTurns, node.value.length);
        break;

      // TODO what was this doing? hacking the language tree to make then turns indexed by color implicitly?
      // case 'then':
      //   if (node.turn.type === 'turns') {
      //     var colorSyms = walk.collect(node.color, ({ type }) =>
      //       type === 'symbol' || type === 'identifier');
      //     if (colorSyms.length === 1) {
      //       node.turn = {
      //         type: 'member',
      //         value: node.turn,
      //         item: colorSyms[0]
      //       };
      //     }
      //     // TODO: else error
      //   }
      //   break;

    }
  }

  return rezult.just({ maxTurns });
}

/**
 * @param {string} kind
 * @param {Set<string>} symbols
 */
function gensym(kind, symbols) {
  const sym = kind[0].toUpperCase() + kind.slice(1);
  for (let i = 1; /* TODO non-infinite? */; i++) {
    const name = sym + i;
    if (!symbols.has(name)) {
      return name;
    }
  }
}
