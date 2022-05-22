// @ts-check

// TODO these types can become the basis of a directly coded recursive descent
// parser, replacing grammar.{ne,js} entirely

/** @typedef {(
 * | SpecNode
 * | AssignNode
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
 * @prop {AssignNode[]} assigns
 * @prop {RuleNode[]} rules
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

/** @typedef {object} TurnNode
 * @prop {"turn"} type
 * @prop {Turn[]} names
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

/** @typedef {object} TurnsNode
 * @prop {"turns"} type
 * @prop {CountTurn[]} value
 */

/** @typedef {object} CountTurn
 * @prop {NumberNode} count
 * @prop {Turn} turn
 */

// TODO we can drop the dfs utility entirely and instead rely on type traversal
// to clarify the use cases...

/**
 * @param {Node} root
 * @param {(node: Node, descend: () => void) => void} visit
 */
export function dfs(root, visit) {
  each(root);

  /** @param {Node} node */
  function each(node) {
    visit(node, () => proc(node));
  }

  /** @param {Node} node */
  function proc(node) {
    switch (node.type) {

      case 'spec':
        for (const subNode of node.assigns) {
          each(subNode);
        }
        for (const subNode of node.rules) {
          each(subNode);
        }
        break;

      case 'assign':
        each(node.value);
        break;

      case 'rule':
        each(node.when);
        each(node.then);
        break;

      case 'when':
        each(node.state);
        each(node.color);
        break;

      case 'then':
        each(node.state);
        each(node.color);
        each(node.turn);
        break;

      case 'thenVal':
        if (node.mode !== '_') each(node.value);
        break;

      case 'member':
        each(node.value);
        each(node.item);
        break;

      case 'expr':
        each(node.arg1);
        each(node.arg2);
        break;

      case 'identifier':
      case 'number':
      case 'symbol':
      case 'turn':
        break;

      case 'turns':
        // TODO y no node.value.forEach(({value: turnNode}) => each(turnNode))
        break;

      default:
        nopeNode(node);
    }
  }

  /** @param {never} node */
  function nopeNode(node) {
    throw new Error(`invalid node ${JSON.stringify(node)}`);
  }
}

/** @typedef {Node['type']} NodeType */

/**
 * @template {NodeType} T
 * @typedef {Extract<Node, {type: T}>} TypedNode
 */

/**
 * @template {NodeType} T
 * @param {Node} node
 * @param {T} type
 */
export function collect(node, type) {
  /** @type {TypedNode<T>[]} */
  const nodes = [];
  dfsPre(node, child => {
    if (child.type == type) {
      nodes.push(/** @type {TypedNode<T>} */(child));
    }
  });
  return nodes;
}

/**
 * @param {Node} root
 * @param {(node: Node) => void} visit
 */
export function dfsPre(root, visit) {
  dfs(root, (node, descend) => {
    visit(node);
    descend();
  });
}
