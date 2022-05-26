// @ts-check

import { from as rleFrom } from '../rle-builder.js';

/** @typedef {import('./walk.js').Node} Node */


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

/**
 * @param {Node[]} nodes
 * @returns {Generator<string>}
 */
export function* toSpecString(...nodes) {
  yield* toString(0, ...nodes);
}

/**
 * @param {number} outerPrec
 * @param {Node[]} nodes
 * @returns {Generator<string>}
 */
function* toString(outerPrec, ...nodes) {
  for (const node of nodes) {
    switch (node.type) {

      case 'spec': {
        const { entries } = node;
        for (const entry of entries) {
          yield* toString(outerPrec, entry);
        }
        break;
      }

      case 'comment': {
        const { comment } = node;
        yield `--${comment}`;
        break;
      }

      case 'directive': {
        const { name, value } = node;
        yield `@${name} ${value}`
        break;
      }

      case 'assign': {
        const { id: { name }, value } = node;
        const it = toString(outerPrec, value)
        yield `${name} = ${next(it, '')}`;
        yield* it;
        break;
      }

      case 'rule': {
        const { when, then } = node;
        const it = toString(outerPrec, when, then)
        yield `${next(it, '')} => ${next(it, '')}`;
        yield* it;
        break;
      }

      case 'when': {
        const { state, color } = node;
        const it = toString(outerPrec, state, color);
        yield `${next(it, '')}, ${next(it, '')}`;
        yield* it;
        break;
      }

      case 'then':
        const { state, color, turn } = node;
        const it = toString(outerPrec, state, color, turn);
        yield `${next(it, '')}, ${next(it, '')}, ${next(it, '')}`;
        yield* it;
        break;

      case 'thenVal': {
        const { mode } = node;
        if (mode === '_') {
          yield '_';
          break;
        }

        const { value } = node;
        const it = toString(outerPrec, value);
        yield `${mode === '=' ? '' : mode}${next(it, '')}`;
        yield* it;
        break;
      }

      case 'member': {
        const { value, item } = node;
        const it = toString(outerPrec, value, item);
        yield `${next(it, '')}[${next(it, '')}]`;
        yield* it;
        break;
      }

      case 'expr': {
        const { op, arg1, arg2 } = node;
        const prec = opPrec.indexOf(op)
        const it = toString(outerPrec, arg1, arg2);
        const expr = `${next(it, '')} ${op} ${next(it, '')}`;
        yield prec < outerPrec ? `(${expr})` : expr;
        yield* it;
        break;
      }

      case 'identifier':
      case 'symbol': {
        const { name } = node;
        yield name;
        break;
      }

      case 'ant':
      case 'turns': {
        const { type, turns } = node;
        yield `${type}(${rleFrom(turns
          .map(({ count: { value: count }, turn }) => [count, TurnSyms[turn]])
        )
          .map(([count, sym]) => count > 1 ? `${count}${sym}` : sym)
          .join(' ')})`;
        break;
      }

      case 'turn': {
        const { names } = node;
        yield names.map(name => TurnSyms[name]).join('|');
        break;
      }

      case 'number': {
        const { value, base } = node;
        yield value.toString(base);
        break;
      }

      default:
        assertNever(node, 'invalid grammar node');
    }
  }
}

/** @template T
 * @param {Iterator<T>} it
 * @param {T} or
 */
function next(it, or) {
  const { done, value } = it.next();
  return done ? or : value;
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}
