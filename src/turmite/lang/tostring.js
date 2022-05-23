// @ts-check

import { from as rleFrom } from '../rle-builder.js';
import * as walk from './walk.js';

// TODO reconcile with ../constants.js
const TurnSyms = {
  RelLeft: 'L',
  RelRight: 'R',
  RelForward: 'F',
  RelBackward: 'B',
  RelDoubleLeft: 'P',
  RelDoubleRight: 'S',
  AbsNorth: 'NO',
  AbsNorthWest: 'NW',
  AbsNorthEast: 'NE',
  AbsSouth: 'SO',
  AbsSouthEast: 'SE',
  AbsSouthWest: 'SW'
};

// TODO: de-dupe
const opPrec = ['+', '-', '*', '/', '%'];

/** @param {walk.Node} root */
export function* toSpecString(root) {
  /** @type {string[]} */
  const lines = [];

  const precs = [0];
  /** @type {string[]} */
  const stack = [];

  function pop() {
    const term = stack.pop();
    if (term === undefined) {
      throw new Error('toSpecString blew its stack');
    }
    lines.push(term);
  }

  /** @param {number|undefined} n */
  function orNaN(n) {
    return n === undefined ? NaN : n;
  }

  // TODO this is mostly duplicated structure with walk.dfs ; just wholly
  // subsume its DFS logic ; in fact it'll be clearer once each case owns it's
  // own "descend TO WHAT", rather than hiding them behind some guise of
  // generality
  walk.dfs(root, (node, descend) => {
    switch (node.type) {

      case 'spec':
        descend();
        break;

      case 'assign':
        stack.push(node.id.name);
        descend();
        join(' = ');
        pop();
        break;

      case 'rule':
        descend();
        join(' => ');
        pop();
        break;

      case 'when':
        descend();
        join(', ');
        break;

      case 'then':
        descend();
        join(', ');
        join(', ');
        break;

      case 'thenVal':
        switch (node.mode) {
          case '|':
            stack.push(node.mode);
            descend();
            join('');
            break;

          case '=':
            descend();
            break;

          case '_':
            stack.push(node.mode);
            break;

          default:
            assertNever(node, 'invalid thenVal mode');
        }
        break;

      case 'member':
        descend();
        wrap('[', ']');
        join('');
        break;

      case 'expr':
        precs.push(opPrec.indexOf(node.op));
        descend();
        join(` ${node.op} `);
        if (orNaN(precs.pop()) < orNaN(precs[precs.length - 1])) {
          wrap('(', ')');
        }
        break;

      case 'identifier':
      case 'symbol':
        stack.push(node.name);
        descend();
        break;

      case 'ant':
      case 'turns':
        stack.push(`${node.type}(${rleFrom(node.turns
          .map(({ count: { value: count }, turn }) => [count, TurnSyms[turn]])
        )
          .map(([count, sym]) => count > 1 ? `${count}${sym}` : sym)
          .join(' ')})`);
        break;

      case 'turn':
        stack.push(node.names.map(name => TurnSyms[name]).join('|'));
        break;

      case 'number':
        stack.push(node.value.toString());
        descend();
        break;

      default:
        assertNever(node, 'invalid grammar node');
    }
  });

  // if the caller called us with some arbitrary grammar node, let them have/keep all the pieces ;-)
  while (stack.length) {
    const line = stack.pop();
    if (line !== undefined) {
      lines.push(line);
    }
  }

  // TODO refactor to yield throughout above after we flatten walk.dfs
  yield* lines;

  /** @param {string} sep */
  function join(sep) {
    const b = stack.pop();
    const a = stack.pop();
    stack.push(`${a}${sep}${b}`);
  }

  /**
   * @param {string} pre
   * @param {string} post
   */
  function wrap(pre, post) {
    const i = stack.length - 1;
    stack[i] = `${pre}${stack[i]}${post}`;
  }
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}
