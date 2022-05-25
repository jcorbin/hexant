// @ts-check

// TODO these types can become the basis of a directly coded recursive descent
// parser, replacing grammar.{ne,js} entirely

/** @typedef {(
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
 * @prop {(AssignNode|AntNode|RuleNode)[]} entries
 */

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
