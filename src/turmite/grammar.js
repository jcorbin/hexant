// @ts-check

// TODO these types can become the basis of a directly coded recursive descent
// parser.js which can replace lang/grammar.{ne,js} entirely

/** @typedef {(
 * | CommentNode
 * | DirectiveNode
 * | SpecNode
 * | AssignNode
 * | AntNode
 * | RuleNode
 * | WhenNode
 * | ThenNode
 * | ThenValNode
 * | MemberNode
 * | ExprNode<NumberNode|TurnsNode>
 * | IdentifierNode
 * | NumberNode
 * | SymbolNode
 * | TurnNode
 * | TurnsNode
 * )} Node */

/** @typedef {object} CommentNode
 * @prop {"comment"} type
 * @prop {string} comment
 */

/** @typedef {object} DirectiveNode
 * @prop {"directive"} type
 * @prop {string} name
 * @prop {string} value
 */

/** @template Literal
 * @typedef {(
 * | Value<Literal>
 * | ExprNode<Literal>
 * )} Expr */

/** @template Literal
 * @typedef {(
 * | MemberNode
 * | SymbolNode
 * | IdentifierNode
 * | Literal
 * )} Value */

/** @typedef {object} SpecNode
 * @prop {"spec"} type
 * @prop {EntryNode[]} entries
 */

/** @typedef {(
 * | AssignNode
 * | CommentNode
 * | DirectiveNode
 * | AntNode
 * | RuleNode
 * )} EntryNode */

/** @typedef {Value<NumberNode|TurnsNode>} AnyValue */
/** @typedef {Expr<NumberNode|TurnsNode>} AnyExpr */

/** @typedef {object} AssignNode
 * @prop {"assign"} type
 * @prop {IdentifierNode} id
 * @prop {AnyExpr} value
 */

/** @typedef {object} RuleNode
 * @prop {"rule"} type
 * @prop {WhenNode} when
 * @prop {ThenNode} then
 */

/** @typedef {object} WhenNode
 * @prop {"when"} type
 * @prop {AnyExpr} state TODO should not be able to have turns
 * @prop {AnyExpr} color TODO should not be able to have turns
 */

/** @typedef {object} ThenNode
 * @prop {"then"} type
 * @prop {ThenValNode} state TODO .value should not be be able to have turns
 * @prop {ThenValNode} color TODO .value should not be be able to have turns
 * @prop {ThenValNode} turn
 */

/** @typedef {(
 * | {type: "thenVal", mode: ("|" | "="), value: AnyExpr}
 * | {type: "thenVal", mode: "_"}
 * )} ThenValNode
 */

/** @typedef {object} MemberNode
 * @prop {"member"} type
 * @prop {AnyValue} value TODO should not be able to have turns?
 * @prop {AnyExpr} item TODO should not be able to have turns?
 */

/** @template Literal
 * @typedef {object} ExprNode
 * @prop {"expr"} type
 * @prop {ExprOp} op
 * @prop {Expr<Literal>} arg1
 * @prop {Expr<Literal>} arg2
 */

/** @typedef {"+" | "-" | "*" | "/" | "%"} ExprOp */

/** @typedef {object} IdentifierNode
 * @prop {"identifier"} type
 * @prop {string} name
 */

/** @typedef {object} NumberNode
 * @prop {"number"} type
 * @prop {number} value
 * @prop {number} [base]
 */

/** @typedef {object} SymbolNode
 * @prop {"symbol"} type
 * @prop {string} name
 */

/** @typedef {(
 * | 'RelLeft'
 * | 'RelRight'
 * | 'RelForward'
 * | 'RelBackward'
 * | 'RelDoubleLeft'
 * | 'RelDoubleRight'
 * | 'AbsNorthWest'
 * | 'AbsNorth'
 * | 'AbsNorthEast'
 * | 'AbsSouthEast'
 * | 'AbsSouth'
 * | 'AbsSouthWest'
 * )} Turn */

/** @typedef {object} TurnNode
 * @prop {"turn"} type
 * @prop {Turn[]} names
 */

/** @typedef {object} AntNode
 * @prop {"ant"} type
 * @prop {CountTurn[]} turns
 */

/** @typedef {object} TurnsNode
 * @prop {"turns"} type
 * @prop {CountTurn[]} turns
 */

/** @typedef {object} CountTurn
 * @prop {NumberNode} count
 * @prop {Turn} turn
 */

/** @typedef {Node['type']} NodeType */

/**
 * @template {NodeType} T
 * @typedef {Extract<Node, {type: T}>} TypedNode
 */

/**
 * @template {NodeType} T
 * @param {T} type
 * @param {Node} node
 * @returns {node is TypedNode<T>}
 */
export function isNodeType(type, node) {
  return node.type === type;
}

/**
 * @param {Node} node
 * @returns {node is EntryNode}
 */
export function isEntryNode(node) {
  switch (node.type) {
    case 'ant':
    case 'assign':
    case 'comment':
    case 'directive':
    case 'rule':
      return true;
    default:
      return false;
  }
}

// TODO generic id/sym/value/expr lifts, and then used consistently throughout

/**
 * @param {string} name
 * @param {string} value
 * @returns {DirectiveNode}
 */
export function directive(name, value) {
  return { type: 'directive', name, value };
}

/**
 * @param {string} comment
 * @returns {CommentNode}
 */
export function comment(comment) {
  return { type: 'comment', comment };
}

/**
 * @param {number} value
 * @param {number} [base] - defaults to base-10 if unspecified
 * @returns {NumberNode}
 */
export function number(value, base) {
  return { type: 'number', value, base };
}

/**
 * @param {string} name
 * @returns {IdentifierNode}
 */
export function id(name) {
  return { type: 'identifier', name };
}

/**
 * @param {string} name
 * @returns {SymbolNode}
 */
export function sym(name) {
  return { type: 'symbol', name };
}

/**
 * @param {EntryNode[]} entries
 * @returns {SpecNode}
 */
export function spec(...entries) {
  return { type: 'spec', entries };
}

/**
 * @param {string|IdentifierNode} id
 * @param {AnyExpr} value
 * @returns {AssignNode}
 */
export function assign(id, value) {
  if (typeof id === 'string') id = { type: 'identifier', name: id };
  return { type: 'assign', id, value };
}

/**
 * @param {WhenNode} when
 * @param {ThenNode} then
 * @returns {RuleNode}
 */
export function rule(when, then) {
  return { type: 'rule', when, then };
}

/**
 * @param {CountTurn[]} turns
 * @returns {AntNode}
 */
export function ant(...turns) {
  return { type: 'ant', turns };
}

/**
 * @param {CountTurn[]} turns
 * @returns {TurnsNode}
 */
export function turns(...turns) {
  return { type: 'turns', turns };
}

/**
 * @param {AnyValue} value
 * @param {AnyExpr} item
 * @returns {MemberNode}
 */
export function member(value, item) {
  return { type: 'member', value, item };
}

/**
 * @template {Node} S
 * @template {Node} T
 * @param {ExprOp} op
 * @param {S} arg1
 * @param {T} arg2
 * @returns {ExprNode<S|T>}
 */
export function expr(op, arg1, arg2) {
  return { type: 'expr', op, arg1, arg2 };
}

/**
 * @param {AnyExpr} state
 * @param {AnyExpr} color
 * @returns {WhenNode}
 */
export function when(state, color) {
  return ({ type: 'when', state, color });
}

/**
 * @param {AnyExpr|ThenValNode} state
 * @param {AnyExpr|ThenValNode} color
 * @param {AnyExpr|ThenValNode} turn
 * @returns {ThenNode}
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
 * @param {AnyExpr|ThenValNode} value
 * @param {"="|"|"} [mode]
 * @returns {ThenValNode}
 */
export function thenVal(value, mode = '=') {
  return value.type === 'thenVal' ? value : { type: 'thenVal', mode, value };
}

/**
 * @param {AnyExpr} value
 * @returns {ThenValNode}
 */
export function thenSet(value) {
  return { type: 'thenVal', mode: '=', value };
}

/**
 * @param {AnyExpr} value
 * @returns {ThenValNode}
 */
export function thenUpdate(value) {
  return { type: 'thenVal', mode: '|', value };
}

/** @returns {ThenValNode} */
export function thenPass() {
  return { type: 'thenVal', mode: '_' };
}

/**
 * @param {Node} node
 * @returns {node is AnyExpr}
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
 * @param {Node} node
 * @returns {node is AnyValue}
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

