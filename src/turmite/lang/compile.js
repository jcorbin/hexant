// @ts-check

import * as rezult from '../../rezult.js';
import * as constants from '../constants.js';

import * as analyze from './analyze.js';
import { toSpecString } from './tostring.js';
import * as walk from './walk.js';

// TODO: de-dupe
const opPrec = ['+', '-', '*', '/', '%'];

/** @typedef {{[key: number]: number}} Rules - A turmite rule lookup table
 *
 * Keys have 2 bit-packed fields encoding color and state:
 * - color: the value of the cell currently occupied by the turmite
 * - state: the turmite's current internal state value; has no intrinsic
 *          semantics other than as part of rules table keys, broadening
 *          the space of potential rules greatly as compared to an ant that
 *          merely dispatches on color
 *
 * Values have 3 bit-packed fields encoding result color, state, and turn:
 * - color: the cell currently occupied by the turmite will have its color
 *          changed to this value
 * - state: the turmite's state value will be set to this; its primary purpose
 *          is to expand the rule table keyspace, allowing for things like
 *          multiple "modes" of turmite rules to be packed into one table
 * - turn: bit field encoding what turn(s) the turmite should make after
 *         updating color and state as above; having multiple turn bits set
 *         implies a "fork" (creation of one or more new turmites)
 *
 * Therefore a rules table MUST have a specific/static length to fully
 * encompass all possible color|state keys; see RuleConstants below for how
 * particulars are specified.
 */

/** @typedef {object} RuleConstants - specifies rule lookup table particulars
 * @prop {number} MaxColor - maximum color value; should be some 2^N-1
 * @prop {number} MaxState - maximum state value; should be some 2^N-1
 * @prop {number} MaxTurn - maximum turn value; should be some 2^N-1
 * @prop {number} MaskResultColor - color field mask for result extraction
 * @prop {number} MaskResultState - state field mask for result extraction
 * @prop {number} MaskResultTurn - turn field mask for result extraction
 * @prop {number} ColorShift - bit width to shift color values by when packing keys and extracting results
 * @prop {number} TurnShift - bit width to shift turn values by when extracting results
 * NOTE: state values live in the lowest bits and are therefore unshifted
 */

/**
 * @param {walk.SpecNode} spec
 * @returns {rezult.Result<function>}
 */
export default function compile(spec) {
  const lines = compileCode(spec);
  const codeRes = rezult.catchErr(() => rezult.just([...endLines(lines)].join('')));

  const funcRes = rezult.bind(codeRes, code => {
    try {
      return rezult.just(Function(`"use strict"; return (${code})`));
    } catch (codeErr) {
      return rezult.error(new Error(`${codeErr}\nTrying to compile:\n${code}`));
    }
  });

  const valRes = rezult.bind(funcRes, func =>
    rezult.catchErr(() => rezult.just(func())));

  return rezult.bind(valRes, value => {
    // TODO replace this runtime type validation with a test-time typecheck of
    // some example code

    if (typeof value != 'function') {
      return rezult.error(new Error(
        `invalid builder function, got a ${typeof value} instead of a function`))
    }

    return rezult.just(/** @type {function} */(value));
  });
}

/** @typedef {"value"|"module"} CodeFormat */

/**
 * @param {walk.SpecNode} spec
 * @param {object} [options]
 * @param {CodeFormat} [options.format]
 */
export function compileCode(spec, { format = 'value' } = {}) {
  // TODO proper scope-stack management
  const symbols = new Set([
    // dependencies
    'World',

    // definitions
    'specString',
    'numColors',

    // build(...) => {...}
    '_rules',
    '_states',

    // matching when state
    '_state',
    '_stateKey',

    // matching when color
    '_color',
    '_colorKey',

    // inner _rules update tmp
    '_priorMask',
  ]);

  analyze.transform(spec, analyze.matchType('assign', ({ id: { name } }) => {
    if (symbols.has(name))
      throw new Error(`redefinition of symbol ${name}`);
    symbols.add(name);
  }));

  return compileContent(spec);

  /** @param {walk.SpecNode} spec */
  function* compileContent(spec) {
    switch (format) {
      case 'value':
        yield* compileObject(spec);
        break;

      case 'module':
        yield* compileModule(spec);
        break;

      default:
        assertNever(format, 'invalid format');
    }
  }

  /** @param {walk.SpecNode} spec */
  function* compileObject(spec) {
    yield* amend('(_rules, World) => ', block(
      compileDefinitions(spec),
      compileRuleBuilder(spec),
    ));
  }

  /** @param {walk.SpecNode} spec */
  function* compileModule(spec) {
    yield* compileDefinitions(spec);
    yield* amend('export default function build(_rules, World) ', block(
      compileRuleBuilder(spec),
    ));
  }

  /** @param {walk.SpecNode} spec */
  function* compileDefinitions(spec) {
    yield* amend({
      head: 'const specString = ',
      cont: '  ',
      zero: `''`,
      foot: ';',
    }, multiLineQuoted(toSpecString(spec)));
    yield '';

    yield `const numColors = ${countMaxTurns(spec)};`;
    yield '';
  }

  /**
   * @param {walk.Node} node
   * @param {amendments} [params]
   */
  function* compileSpecComment(node, params) {
    let spec = toSpecString(node);
    if (params) spec = amend(params, spec);
    yield* comment(spec);
  }

  /** @param {walk.SpecNode} spec */
  function* compileRuleBuilder(spec) {
    yield 'const _states = new Set();';
    yield '';

    for (const assign of spec.assigns) {
      yield* compileSpecComment(assign, { head: 'assign: ' });
      yield* compileAssign(assign);
      yield '';
    }

    for (const rule of spec.rules) {
      switch (rule.type) {
        case 'ant':
          yield* compileSpecComment(rule, { head: 'rule: ' });
          yield* compileRule(analyze.antRule(rule.turns));
          yield '';
          break;

        case 'rule':
          yield* compileSpecComment(rule, { head: 'rule: ' });
          yield* compileRule(rule);
          yield '';
          break;

        default:
          assertNever(rule, 'invalid rule node');
      }
    }

    yield 'return {value: {specString, numColors, numStates: _states.size}};';
  }

  /** @param {walk.AssignNode} assign */
  function* compileAssign({ id: { name }, value }) {
    yield `let ${name} = ${compileValue(value)};`; // TODO can this be constified?
  }

  /** @param {walk.RuleNode} rule */
  function* compileRule(rule) {
    /** @type {walk.AssignNode[]} */
    const assigns = [];
    const scope = new Set(...symbols);

    const { when, then } = analyze.transformed(rule,

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

      analyze.matchType('member', ({ value, item }) => {
        switch (value.type) {
          case 'symbol':
          case 'identifier':
            return null;
          default:
            const { type } = value;
            const name = gensym(`${type[0].toUpperCase()}${type.slice(1)}`, scope);
            assigns.push(analyze.assign(name, value));
            const id = analyze.id(name);
            return analyze.member(id, item);
        }
      }),

    );

    yield* block(
      ...assigns.map(assign => compileAssign(assign)),
      compileRuleBody(when, then),
    );
  }

  /**
   * @param {walk.WhenNode} when
   * @param {walk.ThenNode} then
   */
  function* compileRuleBody(
    { state: whenState, color: whenColor },
    { state: thenState, color: thenColor, turn: thenTurn },
  ) {

    /** @typedef {object} ThenDecl
     * @prop {string} name
     * @prop {string} mask
     * @prop {string} max
     * @prop {string} [shift]
     */

    const thens = /** @type {({then: walk.ThenValNode} & ThenDecl)[]} */ ([
      {
        name: 'state',
        then: thenState,
        mask: 'World.MaskResultState',
        max: 'World.MaxState',
        shift: 'World.ColorShift',
      },
      {
        name: 'color',
        then: thenColor,
        mask: 'World.MaskResultColor',
        max: 'World.MaxColor',
        shift: 'World.TurnShift',
      },
      {
        name: 'turn',
        then: thenTurn,
        mask: 'World.MaskResultTurn',
        max: 'World.MaxTurn',
      },
    ]).map(({ then, ...decl }) => {
      /** @type {string|null} */
      let expr = null;

      const { mode } = then;
      if (mode !== '_') {
        const { value } = then;
        expr = compileValue(value, opPrec.length);
        if (expr === '0' && mode === '|') expr = null;
      }

      return { then, expr, ...decl };
    });
    if (thens.every(({ expr }) => expr === null)) return;

    /** @typedef {object} WhenDecl
     * @prop {string} name
     * @prop {string} cap
     * @prop {string} sym
     * @prop {string} max
     * @prop {string} [shift]
     * @prop {(cap: string) => string} [init]
     */

    const whens = /** @type {({when: walk.AnyExpr} & WhenDecl)[]} */ ([
      {
        when: whenState,
        name: 'state',
        cap: '_state',
        sym: '_stateKey',
        shift: 'World.ColorShift',
        max: 'World.MaxState',
        init: cap => `_states.add(${cap});`,
      },
      {
        when: whenColor,
        name: 'color',
        cap: '_color',
        sym: '_colorKey',
        max: 'World.MaxColor',
      },
    ]);

    const maskParts = thens
      .map(({ then: { mode }, mask }) => mode === '=' ? mask : '')
      .filter(part => part);
    switch (maskParts.length) {
      case 0:
        break;

      case 1:
        yield `const _priorMask = ~${maskParts[0]};`;
        yield '';
        break;

      default:
        yield `const _priorMask = ~(${maskParts
          .reduce((mask, part) => `${mask}${mask ? ' | ' : ''}${part}`)});`;
        yield '';
    }

    yield* compileWhenMatch(0);

    /**
     * @param {number} i -- whens[i]
     * @returns {Generator<string>}
     */
    function* compileWhenMatch(i, priorKey = '') {
      if (i < whens.length) {
        const
          { name, when, cap, sym, shift, max, init } = whens[i],
          body = function*() {
            let keyExpr = cap;
            if (shift) {
              if (priorKey) keyExpr = `(${priorKey} | ${keyExpr})`;
              keyExpr = `${keyExpr} << ${shift}`;
            } else if (priorKey) keyExpr = `${priorKey} | ${keyExpr}`;
            yield `const ${sym} = ${keyExpr};`;
            if (init) yield init(cap);
            yield '';
            yield* compileWhenMatch(i + 1, sym);
          };

        yield* compileSpecComment(when, { head: `when ${name} matches: ` });

        switch (when.type) {
          case 'symbol':
          case 'expr':
            const syms = [...freeSymbols(when, symbols)];
            if (syms.length > 1) {
              throw new Error('matching more than one variable is unsupported');
            }

            const free = syms[0];
            if (!free) {
              throw new Error('no match variable');
            }

            const matchExpr = solve(free, cap, when);

            yield* amend(`for (let ${cap} = 0; ${cap} <= ${max}; ${cap}++) `, block(
              matchExpr === cap
                ? `const ${free} = ${matchExpr};`
                : [
                  `const ${free} = (${max} + ${matchExpr}) % ${max};`,
                  // TODO: gratuitous guard, only needed if division is involved
                  `if (Math.floor(${free}) !== ${free}) continue;`,
                ],
              body(),
            ));
            break;

          case 'number':
            yield `const ${cap} = ${when.value};`;
            yield* body();
            break;

          default:
            throw new Error(`unsupported match type ${when.type}`);
        }
      }

      else {
        /** @type {string[]} */
        const parts = [];

        const reduceParts = () => {
          while (parts.length > 1) {
            const b = parts.pop();
            const a = parts.pop();
            parts.push(`${a}\n| ${b}`);
          }
          return parts.pop() || '';
        };

        for (const { name, then, expr, max, shift } of thens) {
          const { mode } = then;
          const comment = mode === '_'
            ? []
            : [...compileSpecComment(
              then.value,
              { head: `then ${name} ${mode}${mode == '=' ? '' : '='} ` })
            ];

          if (expr !== null && expr !== '0') {
            // TODO &max is only valid if max is some 2^N-1, otherwise should use Math.min(max, ...)
            parts.push(`${expr} & ${max}`);
          }

          if (parts.length) {
            parts.push(`${parts.pop()}${comment.length ? ' ' + comment.join('\n') : ''}`);
          } else if (comment.length) yield* comment;

          if (parts.length && shift) {
            parts.push(`( ${reduceParts()}\n) << ${shift}`);
          }
        }

        if (maskParts.length) {
          parts.unshift(`_rules[${priorKey}] & _priorMask`);
        }

        if (parts.length) {
          yield* amend({
            head: `_rules[${priorKey}] = `,
            cont: '  ',
          }, reduceParts().split(/\n/));
          yield '  ;';
        }
      }
    }
  }
}

/** @param {walk.SpecNode} spec */
function countMaxTurns(spec) {
  let maxTurns = 0;
  analyze.transform(spec,
    analyze.matchType('ant', ({ turns }) => { maxTurns = Math.max(maxTurns, turns.length) }),
    analyze.matchType('turns', ({ turns }) => { maxTurns = Math.max(maxTurns, turns.length) }),
  );
  return maxTurns;
}

/**
 * @param {string} name
 * @param {Set<string>} symbols
 */
function gensym(name, symbols) {
  for (let i = 1; /* TODO non-infinite? */; i++) {
    const uname = name + i;
    if (!symbols.has(uname)) {
      symbols.add(uname);
      return uname;
    }
  }
}

/**
 * @param {string} cap
 * @param {string} sym
 * @param {walk.Expr<walk.NumberNode | walk.TurnsNode>} expr - TODO what even does it mean to solve a turns expression; tighten?
 * @param {number} [outerPrec]
 * @returns {string}
 */
function solve(cap, sym, expr, outerPrec = 0) {
  const invOp = {
    '+': '-',
    '*': '/',
    '-': '+',
    '/': '*'
  };

  /** @type {string[]} */
  const stack = [sym, ...genStack(expr)];

  /** @returns {string} */
  const consume = (outerPrec = 0) => {
    const arg = stack.pop();
    if (!arg) return 'undefined';

    const prec = opPrec.indexOf(arg);
    if (prec >= 0) {
      const b = consume(prec);
      const a = consume(prec);
      return prec < outerPrec
        ? `(${a} ${arg} ${b})`
        : `${a} ${arg} ${b}`;
    }

    return arg;
  };

  const res = consume(outerPrec);
  if (stack.length) throw new Error('leftover solution stack');
  return res;

  /**
   * @param {walk.Expr<walk.NumberNode | walk.TurnsNode>} expr
   * @returns {Generator<string>}
   */
  function* genStack(expr) {
    switch (expr.type) {

      case 'expr':
        const { op, arg1, arg2 } = expr;

        const leftHasSym = usedSymbols(arg1).has(cap);
        const rightHasSym = usedSymbols(arg2).has(cap);
        if (leftHasSym && rightHasSym) {
          // TODO: solve each side to intermediate values
          throw new Error('matching complex expressions not supported');
        }

        switch (op) {

          case '+':
          case '*':
            // color = c [*+] 6 = 6 [*+] c
            // c = color [/-] 6
            if (leftHasSym) {
              yield* genStack(arg2);
              yield invOp[op];
              yield* genStack(arg1);
              return;
            }
            if (rightHasSym) {
              yield* genStack(arg1);
              yield invOp[op];
              yield* genStack(arg2);
              return;
            }
            break;

          case '-':
          case '/':
            if (leftHasSym) {
              // color = c [-/] 6
              // c = color [+*] 6
              yield* genStack(arg2);
              yield invOp[op];
              yield* genStack(arg1);
              return;
            }
            if (rightHasSym) {
              // color = 6 [-/] c
              // c = 6 [-/] color
              yield* genStack(arg1);
              yield op;
              yield* genStack(arg2);
              return;
            }
            break;

          case '%':
            throw new Error(`unimplemented modulo operator solving`);

          default:
            assertNever(op, 'invalid expression operator');
        }
        break;

      case 'symbol':
        if (expr.name !== cap) yield expr.name;
        return;
    }

    yield compileValue(expr);
  }
}

/**
 * @param {walk.Expr<walk.NumberNode | walk.TurnsNode>|walk.TurnNode} node
 * @param {number} [outerPrec]
 * @returns {string}
 */
function compileValue(node, outerPrec = 0) {
  switch (node.type) {

    case 'turn':
      return `0x${node.names
        .reduce((turn, name) => turn | constants.Turn[name], 0)
        .toString(16).padStart(2, '0')}`;

    case 'turns':
      const parts = [];
      for (const { count, turn } of node.turns) {
        const turnStr = `0x${constants.Turn[turn]
          .toString(16).padStart(2, '0')}`;
        for (let i = 0; i < count.value; i++) {
          parts.push(turnStr);
        }
      }
      return `[${parts.join(', ')}]`;

    case 'expr':
      const prec = opPrec.indexOf(node.op);
      const val1 = compileValue(node.arg1, prec);
      const val2 = compileValue(node.arg2, prec);
      const exprStr = `${val1} ${node.op} ${val2}`;
      return prec < outerPrec ? `(${exprStr})` : exprStr;

    case 'member':
      // TODO error if !symbols.has(sym)
      const baseVal = compileValue(node.value, 0);
      const itemVal = compileValue(node.item, opPrec.length);
      return `${baseVal}[${`${itemVal} % ${baseVal}.length`}]`;

    case 'symbol':
    case 'identifier':
      return node.name;

    case 'number':
      switch (node.base) {
        case 16:
          return `0x${node.value.toString(16)}`;
        default:
          return node.value.toString(10);
      }

    default:
      assertNever(node, 'invalid value node');
      return `/* invalid node type */`; // unreachable branch, but tsc can't prove that?
  }
}

/**
 * @param {walk.Node} node
 * @param {Set<string>} symbols
 */
function freeSymbols(node, symbols) {
  return new Set(
    walk.collect(node, 'symbol')
      .map(({ name }) => name)
      .filter(name => !symbols.has(name))
  );
}

/**
 * @param {walk.Node} node
 */
function usedSymbols(node) {
  return new Set(
    walk.collect(node, 'symbol')
      .map(({ name }) => name)
  );
}

/** @param {Iterable<string>} lines */
function* multiLineQuoted(lines) {
  // NOTE: there's a similar routine in glsl-loader.js
  let next = '';
  for (const line of lines) {
    if (next) {
      yield `${next} +`;
    }
    next = JSON.stringify(line + '\n');
  }
  if (next) {
    yield next;
  }
}

/** @param {Iterable<string>} lines */
function* comment(lines, mark = '// ') {
  yield* prefix(mark, lines);
}

/**
* @param {string} prefix
* @param {Iterable<string>} lines
*/
function* prefix(prefix, lines) {
  const allSpace = prefix.trim().length == 0;
  for (const line of lines) {
    yield line || !allSpace ? prefix + line : line;
  }
}

/** @param {Iterable<string>} lines */
export function* endLines(lines, nl = '\n') {
  for (const line of lines) {
    yield line + nl;
  }
}

/** @typedef {object} amendments
 * @prop {string} [head] - prefix for the first line
 * @prop {string} [foot] - suffix for the last line
 * @prop {string} [cont] - prefix for all lines after the first
 * @prop {string} [zero] - filler value when lines is empty
 */

/** @param {(Iterable<string>|string)[]} parts */
function* block(...parts) {
  yield* wrap({ head: '{', cont: '  ', foot: '}' }, ...parts)
}

/**
 * @param {amendments} params
 * @param {(Iterable<string>|string)[]} parts
 */
function* wrap({ head = '', foot = '', cont = '', zero = 'undefined' }, ...parts) {
  if (head) {
    yield head;
  }
  let any = false;
  for (const line of chain(...parts)) {
    yield cont ? `${cont}${line}` : line;
    any = true;
  }
  if (!any && zero) {
    yield zero;
  }
  if (foot) {
    yield foot;
  }
}

/**
 * @param {string|amendments} params
 * @param {(Iterable<string>|string)[]} parts
 */
function* amend(params, ...parts) {
  if (typeof params == 'string') {
    params = { head: params };
  }
  const { head = '', foot = '', cont = '', zero = 'undefined' } = params;
  let last = '', any = false;
  for (const line of chain(...parts)) {
    if (!any) {
      any = true;
      last = `${head}${line}`;
    } else {
      yield last;
      last = `${cont}${line}`;
    }
  }
  if (any) {
    yield `${last}${foot}`;
  } else {
    yield `${head}${zero}${foot}`;
  }
}

/** @param {(Iterable<string>|string)[]} parts */
function* chain(...parts) {
  for (const part of parts) {
    if (typeof part == 'string') {
      yield part;
    } else {
      yield* part;
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
