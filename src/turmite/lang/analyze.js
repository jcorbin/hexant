// @ts-check

import * as rezult from '../../rezult.js';
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
 * @param {(walk.RuleNode)[]} rules
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
 * @returns {walk.TurnsNode}
 */
export function turns(...turns) {
  return { type: 'turns', value: turns };
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
 * @returns {walk.ThenValNode}
 */
export function thenVal(value) {
  return value.type === 'thenVal' ? value : thenSet(value);
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
  function hoist(value) {
    const name = gensym(value.type, symbols);
    symbols.add(name);
    spec.assigns.push(assign(name, value));
    each(value); // since dfs will no longer visit the value
    return id(name);
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
            node.value = hoist(node.value);
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
      //       node.turn = member(node.turn, colorSyms[0]);
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
