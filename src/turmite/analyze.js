// @ts-check

import {
  assign,
  expr,
  isAnyExpr,
  isAnyValue,
  isEntryNode,
  isNodeType,
  member,
  number,
  rule,
  spec,
  sym,
  then,
  thenPass,
  thenSet,
  thenVal,
  turns,
  when,
} from './grammar.js';

/** @typedef {import('./grammar.js').AnyExpr} AnyExpr */
/** @typedef {import('./grammar.js').ThenValNode} ThenValNode */
/** @typedef {import('./grammar.js').CountTurn} CountTurn */

/** @typedef {import('./grammar.js').Node} Node */
/** @typedef {import('./grammar.js').NodeType} NodeType */

/** @template T @typedef {import('./grammar.js').TypedNode<T>} TypedNode */

/**
 * @param {CountTurn[]} antTurns
 * @param {object} options
 * @param {number} [options.state]
 * @param {AnyExpr} [options.whenState]
 * @param {ThenValNode} [options.thenState]
 */
export function antRule(antTurns, {
  state = 0,
  whenState = number(state),
  thenState = thenSet(number(state)),
} = {}) {
  const c = sym('c');
  return rule(when(whenState, c), then(
    thenState,
    expr('+', c, number(1)),
    member(turns(...antTurns), c),
  ));
}

/**
 * @template {NodeType} T
 * @param {T} type
 * @param {TypedNodeTransform<T>} fn
 * @returns {NodeTransform}
 */
export function matchType(type, fn) {
  return node => isNodeType(type, node)
    ? fn(node)
    : undefined;
}

/** @template {NodeType} T
 * @callback TypedNodeTransform
 * @param {TypedNode<T>} node
 * @returns {TypedNode<T>|null|void}
 */

/** @callback NodeTransform
 * @param {Node} node
 * @returns {Node|null|void}
 */

/**
 * @template {Node} NT
 * @param {NT} node
 * @param {NodeTransform[]} xforms
 * @returns {NT|null}
 */
export function transformed(node, ...xforms) {
  const oldType = node.type;

  /**
   * @param {Node} n
   * @returns {n is NT}
   */
  function isSameType(n) {
    return n.type === oldType;
  }

  const newNode = transform(node, ...xforms);
  if (newNode === null) return null;
  if (!newNode) return node;
  if (!isSameType(newNode)) throw new Error('invalid replacement node');

  return newNode;
}

/**
 * @param {Node} node
 * @param {NodeTransform[]} xforms
 * @returns {Node|null|void}
 */
export function transform(node, ...xforms) {
  if (!xforms.length) return node;

  /** @type {NodeTransform} */
  const xform = xforms.length > 1
    ? node => {
      for (const xform of xforms) {
        node = xform(node) || node;
      }
      return node;
    }
    : xforms[0];
  return each(node);

  /** @param {Node} node @returns {Node|null|void} */
  function each(node) {
    let newNode = xform(node);
    if (newNode === null) return null; // explicit delete
    if (newNode && newNode !== node) {
      newNode = each(newNode) || newNode;
    }
    node = newNode || node;
    switch (node.type) {

      case 'spec': {
        let any = false;
        const entries = node.entries.map(entry => {
          const rep = each(entry);
          if (rep && !isEntryNode(rep))
            throw new Error('invalid replacement spec entry');
          if (rep === undefined) return entry;
          any = any || rep !== entry;
          return rep;
        }).filter(notNull);
        return !any ? undefined // no change
          : !entries.length ? null // delete if empty
            : spec(...entries);
      }

      case 'assign': {
        let id = each(node.id);
        let value = each(node.value);
        if (id === null || value === null) return null; // delete spreads
        if (!id && !value) return undefined; // no change
        if (!id) id = node.id;
        else if (id.type !== 'identifier') throw new Error('invalid replacement identifier node');
        if (!value) value = node.value;
        else if (!isAnyExpr(value)) throw new Error('invalid replacement value node');
        return assign(id, value);
      }

      case 'rule': {
        let when = each(node.when);
        let then = each(node.then);
        if (when === null || then === null) return null; // delete spreads
        if (!when && !then) return undefined; // no change
        if (!when) when = node.when;
        else if (when.type !== 'when') throw new Error('invalid replacement when node');
        if (!then) then = node.then;
        else if (then.type !== 'then') throw new Error('invalid replacement then node');
        return rule(when, then);
      }

      case 'when': {
        let state = each(node.state);
        let color = each(node.color);
        if (state === null || color === null) return null; // delete spreads
        if (!state && !color) return undefined; // no change
        if (!state) state = node.state;
        else if (!isAnyExpr(state)) throw new Error('invalid replacement when.state node');
        if (!color) color = node.color;
        else if (!isAnyExpr(color)) throw new Error('invalid replacement when.color node');
        return when(state, color);
      }

      case 'then': {
        let state = each(node.state);
        let color = each(node.color);
        let turn = each(node.turn);
        if (state === null) state = thenPass(); // deleted clause now passes
        if (color === null) color = thenPass(); // deleted clause now passes
        if (turn === null) turn = thenPass(); // deleted clause now passes
        if (!state && !color && !turn) return undefined; // no change
        if (!state) state = node.state;
        else if (state.type !== 'thenVal') throw new Error('invalid replacement then.state node');
        if (!color) color = node.color;
        else if (color.type !== 'thenVal') throw new Error('invalid replacement then.color node');
        if (!turn) turn = node.turn;
        else if (turn.type !== 'thenVal') throw new Error('invalid replacement then.turn node');
        // delete spreads only if all clauses now pass (at least one was just deleted above)
        if (state.mode === '_' && color.mode === '_' && turn.mode === '_') return null;
        return then(state, color, turn);
      }

      case 'thenVal': {
        const { mode } = node;
        if (mode == '_') return undefined; // no change
        let value = each(node.value);
        if (value === null) return null; // delete spreads
        if (!value) return undefined; // no change
        if (!isAnyExpr(value)) throw new Error('invalid replacement then value node');
        return thenVal(value, mode);
      }

      case 'member': {
        let item = each(node.item);
        let value = each(node.value);
        if (item === null || value === null) return null; // delete spreads
        if (!item && !value) return undefined; // no change
        if (!item) item = node.item;
        else if (!isAnyExpr(item)) throw new Error('invalid replacement item node');
        if (!value) value = node.value;
        else if (!isAnyValue(value)) throw new Error('invalid replacement value node');
        return member(value, item);
      }

      case 'expr': {
        const { op } = node;
        let arg1 = each(node.arg1);
        let arg2 = each(node.arg2);
        if (arg1 === null || arg2 === null) return null; // delete spreads
        if (!arg1 && !arg2) return undefined; // no change
        if (!arg1) arg1 = node.arg1;
        else if (!isAnyExpr(arg1)) throw new Error('invalid replacement arg1 node');
        if (!arg2) arg2 = node.arg2;
        else if (!isAnyExpr(arg2)) throw new Error('invalid replacement arg2 node');
        return expr(op, arg1, arg2);
      }

      case 'ant':
      case 'comment':
      case 'directive':
      case 'identifier':
      case 'number':
      case 'symbol':
      case 'turn':
      case 'turns':
        return undefined;

      default:
        assertNever(node, 'invalid transform node');
        return undefined;
    }
  }
}

/** @template T
 * @param {T|null} val
 * @returns {val is Exclude<T, null>}
 */
function notNull(val) {
  return val !== null;
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}
