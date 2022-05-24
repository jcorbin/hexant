// @ts-check

import * as walk from './walk.js';

/// basic grammar constructors

// TOOD move to ./grammar.js once that's manually written, along with type declarations from ./walk.js

// TODO generic id/sym/value/expr lifts, and then used consistently throughout

/**
 * @param {string} name
 * @returns {walk.IdentifierNode}
 */
export function id(name) {
  return { type: 'identifier', name };
}

/**
 * @param {string} name
 * @returns {walk.SymbolNode}
 */
export function sym(name) {
  return { type: 'symbol', name };
}

/**
 * @param {walk.AssignNode[]} assigns
 * @param {(walk.RuleNode | walk.AntNode)[]} rules
 * @returns {walk.SpecNode}
 */
export function spec(assigns, rules) {
  return { type: 'spec', assigns, rules };
}

/**
 * @param {string|walk.IdentifierNode} id
 * @param {walk.AnyExpr} value
 * @returns {walk.AssignNode}
 */
export function assign(id, value) {
  if (typeof id === 'string') id = { type: 'identifier', name: id };
  return { type: 'assign', id, value };
}

/**
 * @param {walk.WhenNode} when
 * @param {walk.ThenNode} then
 * @returns {walk.RuleNode}
 */
export function rule(when, then) {
  return { type: 'rule', when, then };
}

/**
 * @param {walk.CountTurn[]} turns
 * @returns {walk.AntNode}
 */
export function ant(...turns) {
  return { type: 'ant', turns };
}

/**
 * @param {walk.CountTurn[]} turns
 * @returns {walk.TurnsNode}
 */
export function turns(...turns) {
  return { type: 'turns', turns };
}

/**
 * @param {walk.AnyValue} value
 * @param {walk.AnyExpr} item
 * @returns {walk.MemberNode}
 */
export function member(value, item) {
  return { type: 'member', value, item };
}

/**
 * @template {walk.Node} S
 * @template {walk.Node} T
 * @param {walk.ExprOp} op
 * @param {S} arg1
 * @param {T} arg2
 * @returns {walk.ExprNode<S|T>}
 */
export function expr(op, arg1, arg2) {
  return { type: 'expr', op, arg1, arg2 };
}

/**
 * @param {walk.AnyExpr} state
 * @param {walk.AnyExpr} color
 * @returns {walk.WhenNode}
 */
export function when(state, color) {
  return ({ type: 'when', state, color });
}

/**
 * @param {walk.AnyExpr|walk.ThenValNode} state
 * @param {walk.AnyExpr|walk.ThenValNode} color
 * @param {walk.AnyExpr|walk.ThenValNode} turn
 * @returns {walk.ThenNode}
 */
export function then(state, color, turn) {
  return {
    type: 'then',
    state: thenVal(state),
    color: thenVal(color),
    turn: thenVal(turn),
  };
}

/**
 * @param {walk.AnyExpr|walk.ThenValNode} value
 * @param {"="|"|"} [mode]
 * @returns {walk.ThenValNode}
 */
export function thenVal(value, mode = '=') {
  return value.type === 'thenVal' ? value : { type: 'thenVal', mode, value };
}

/**
 * @param {walk.AnyExpr} value
 * @returns {walk.ThenValNode}
 */
export function thenSet(value) {
  return { type: 'thenVal', mode: '=', value };
}

/**
 * @param {walk.AnyExpr} value
 * @returns {walk.ThenValNode}
 */
export function thenUpdate(value) {
  return { type: 'thenVal', mode: '|', value };
}

/** @returns {walk.ThenValNode} */
export function thenPass() {
  return { type: 'thenVal', mode: '_' };
}

/**
 * @param {walk.Node} node
 * @returns {node is walk.AnyExpr}
 */
export function isAnyExpr(node) {
  switch (node.type) {
    // Expr<Literal>
    case 'expr':
      return true;

    // is Value<Literal>
    default:
      return isAnyValue(node);
  }
}

/**
 * @param {walk.Node} node
 * @returns {node is walk.AnyValue}
 */
export function isAnyValue(node) {
  switch (node.type) {
    // Value<Literal>
    case 'member':
    case 'symbol':
    case 'identifier':

    // Literal = NumberNode | TurnsNode
    case 'number':
    case 'turns':
      return true;

    default:
      return false;
  }
}

/// analysis of grammar node (trees)

/**
 * @param {walk.CountTurn[]} antTurns
 * @param {object} options
 * @param {number} [options.state]
 * @param {walk.AnyExpr} [options.whenState]
 * @param {walk.ThenValNode} [options.thenState]
 */
export function antRule(antTurns, {
  state = 0,
  whenState = { type: 'number', value: state },
  thenState = { type: 'thenVal', mode: '=', value: { type: 'number', value: state } },
} = {}) {
  const c = sym('c');
  return rule(when(whenState, c), then(
    thenState,
    expr('+', c, { type: 'number', value: 1 }),
    member(turns(...antTurns), c),
  ));
}

/**
 * @template {walk.NodeType} T
 * @param {T} type
 * @param {TypedNodeTransform<T>} fn
 * @returns {NodeTransform}
 */
export function matchType(type, fn) {
  return node => walk.isNodeType(type, node)
    ? fn(node)
    : null;
}

/** @template {walk.NodeType} T
 * @callback TypedNodeTransform
 * @param {walk.TypedNode<T>} node
 * @returns {walk.TypedNode<T>|null|void}
 */

/** @callback NodeTransform
 * @param {walk.Node} node
 * @returns {walk.Node|null|void}
 */

/**
 * @template {walk.Node} NT
 * @param {NT} node
 * @param {NodeTransform[]} xforms
 * @returns {NT}
 */
export function transformed(node, ...xforms) {
  const oldType = node.type;

  /**
   * @param {walk.Node} n
   * @returns {n is NT}
   */
  function isSameType(n) {
    return n.type === oldType;
  }

  const newNode = transform(node, ...xforms);
  if (!newNode) return node;
  if (!isSameType(newNode)) throw new Error('invalid replacement node');

  return newNode;
}

/**
 * @param {walk.Node} node
 * @param {NodeTransform[]} xforms
 * @returns {walk.Node|null}
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

  /** @param {walk.Node} node @returns {walk.Node|null} */
  function each(node) {
    node = xform(node) || node;
    switch (node.type) {

      case 'spec': {
        let any = false;
        const assigns = node.assigns.map(assign => {
          const rep = each(assign);
          if (!rep) return assign;
          if (rep.type !== 'assign') throw new Error('invalid replacement assign node');
          any = true;
          return rep;
        });
        const rules = node.rules.map(rule => {
          const rep = each(rule);
          if (!rep) return rule;
          if (!(rep.type === 'rule' || rep.type === 'ant'))
            throw new Error('invalid replacement rule node');
          any = true;
          return rep;
        });
        if (any) return spec(assigns, rules);
        return null;
      }

      case 'assign': {
        let id = each(node.id);
        let value = each(node.value);
        if (id || value) {
          if (!id) id = node.id;
          else if (id.type !== 'identifier') throw new Error('invalid replacement identifier node');
          if (!value) value = node.value;
          else if (!isAnyExpr(value)) throw new Error('invalid replacement value node');
          return assign(id, value);
        }
        return null;
      }

      case 'rule': {
        let when = each(node.when);
        let then = each(node.then);
        if (when || then) {
          if (!when) when = node.when;
          else if (when.type !== 'when') throw new Error('invalid replacement when node');
          if (!then) then = node.then;
          else if (then.type !== 'then') throw new Error('invalid replacement then node');
          return rule(when, then);
        }
        return null;
      }

      case 'when': {
        let state = each(node.state);
        let color = each(node.color);
        if (state || color) {
          if (!state) state = node.state;
          else if (!isAnyExpr(state)) throw new Error('invalid replacement when.state node');
          if (!color) color = node.color;
          else if (!isAnyExpr(color)) throw new Error('invalid replacement when.color node');
          return when(state, color);
        }
        return null;
      }

      case 'then': {
        let state = each(node.state);
        let color = each(node.color);
        let turn = each(node.turn);
        if (state || color || turn) {
          if (!state) state = node.state;
          else if (state.type !== 'thenVal') throw new Error('invalid replacement then.state node');
          if (!color) color = node.color;
          else if (color.type !== 'thenVal') throw new Error('invalid replacement then.color node');
          if (!turn) turn = node.turn;
          else if (turn.type !== 'thenVal') throw new Error('invalid replacement then.turn node');
          return then(state, color, turn);
        }
        return null;
      }

      case 'thenVal': {
        const { mode } = node;
        if (mode == '_') return null;
        let value = each(node.value);
        if (!value) return null;
        if (!isAnyExpr(value)) throw new Error('invalid replacement then value node');
        return thenVal(value, mode);
      }

      case 'member': {
        let item = each(node.item);
        let value = each(node.value);
        if (item || value) {
          if (!item) item = node.item;
          else if (!isAnyExpr(item)) throw new Error('invalid replacement item node');
          if (!value) value = node.value;
          else if (!isAnyValue(value)) throw new Error('invalid replacement value node');
          return member(value, item);
        }
        return null;
      }

      case 'expr': {
        const { op } = node;
        let arg1 = each(node.arg1);
        let arg2 = each(node.arg2);
        if (arg1 || arg2) {
          if (!arg1) arg1 = node.arg1;
          else if (!isAnyExpr(arg1)) throw new Error('invalid replacement arg1 node');
          if (!arg2) arg2 = node.arg2;
          else if (!isAnyExpr(arg2)) throw new Error('invalid replacement arg2 node');
          return expr(op, arg1, arg2);
        }
        return null;
      }

      case 'ant':
      case 'identifier':
      case 'number':
      case 'symbol':
      case 'turn':
      case 'turns':
        return null;

      default:
        assertNever(node, 'invalid transform node');
        return null;
    }
  }
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}
