// @ts-check

import * as rezult from '../rezult.js';
import * as constants from './constants.js';

import * as analyze from './analyze.js';
import { toSpecString } from './tostring.js';

import {
  assign,
  id,
  member,
} from './grammar.js';

/** @typedef {import('./grammar.js').Node} Node */
/** @typedef {import('./grammar.js').SpecNode} SpecNode */
/** @typedef {import('./grammar.js').AssignNode} AssignNode */
/** @typedef {import('./grammar.js').RuleNode} RuleNode */
/** @typedef {import('./grammar.js').WhenNode} WhenNode */
/** @typedef {import('./grammar.js').ThenNode} ThenNode */
/** @typedef {import('./grammar.js').ThenValNode} ThenValNode */
/** @typedef {import('./grammar.js').NumberNode} NumberNode */
/** @typedef {import('./grammar.js').TurnsNode} TurnsNode */
/** @typedef {import('./grammar.js').TurnNode} TurnNode */
/** @typedef {import('./grammar.js').AnyExpr} AnyExpr */
/** @template T @typedef {import('./grammar.js').Expr<T>} Expr */

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
 * @param {SpecNode} spec
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
 * @param {SpecNode} spec
 * @param {object} [options]
 * @param {CodeFormat} [options.format]
 */
export function compileCode(spec, { format = 'value' } = {}) {
  const scope = makeScope();

  return compileContent(spec);

  /** @param {SpecNode} spec */
  function* compileContent(spec) {
    switch (format) {
      case 'value':
        yield* compileArrowFn(scope, ['_rules', 'World'], function*() {
          yield* compileDefinitions(spec);
          yield* compileRuleBuilder(spec);
        });
        break;

      case 'module':
        yield* compileDefinitions(spec);
        yield* compileFunction(scope, 'export default build', ['_rules', 'World'], function*() {
          yield* compileRuleBuilder(spec);
        });
        break;

      default:
        assertNever(format, 'invalid format');
    }
  }

  /** @param {SpecNode} spec */
  function* compileDefinitions(spec) {
    scope.define('specString');
    yield* amend({
      head: 'const specString = ',
      cont: '  ',
      zero: `''`,
      foot: ';',
    }, multiLineQuoted(toSpecString(spec)));
    yield '';

    scope.define('numColors');
    yield `const numColors = ${countNumColors(spec)};`;
    yield '';
  }

  /**
   * @param {Node} node
   * @param {amendments} [params]
   */
  function* compileSpecComment(node, params) {
    let spec = toSpecString(node);
    if (params) spec = amend(params, spec);
    yield* comment(spec);
  }

  /** @param {SpecNode} spec */
  function* compileRuleBuilder(spec) {
    yield 'if (numColors > World.MaxColor+1) return {err: `required numColors:${numColors} exceeds world max:(${World.MaxColor})`};';
    yield '';

    scope.define('_states');
    yield 'const _states = new Set();';
    yield '';

    for (const entry of spec.entries) {
      switch (entry.type) {
        case 'comment':
          yield* comment([entry.comment.trimStart()]);
          break;

        case 'directive':
          yield* comment([`@${entry.name} ${entry.value.trimStart()}`]);
          break;

        case 'assign':
          yield '';
          yield* compileSpecComment(entry, { head: 'assign: ' });
          yield* compileAssign(entry);
          break;

        case 'ant':
          yield '';
          yield* compileSpecComment(entry, { head: 'rule: ' });
          yield* compileRule(analyze.antRule(entry.turns));
          break;

        case 'rule':
          yield '';
          yield* compileSpecComment(entry, { head: 'rule: ' });
          yield* compileRule(entry);
          break;

        default:
          assertNever(entry, 'invalid rule node');
      }
    }

    yield 'return {value: {specString, numColors, numStates: _states.size}};';
  }

  /** @param {AssignNode} assign */
  function* compileAssign({ id: { name }, value }) {
    scope.define(name);
    yield `let ${name} = ${compileValue(scope, value)};`; // TODO can this be constified?
  }

  /** @param {RuleNode} rule */
  function* compileRule(rule) {
    yield* scope.block(function*() {
      /** @type {AssignNode[]} */
      const assigns = [];

      const xrule = analyze.transformed(rule,

        // TODO possible, but uncertain if should bring back implicit indexing
        // analyze.matchType('then', ({ state, color, turn }) => {
        //   const { mode } = turn;
        //   if (mode === '_') return;
        //
        //   const { value } = turn;
        //   if (value.type !== 'turns') return;
        //
        //   /** @type {AnyExpr|null} */
        //   let colorExpr = null;
        //   analyze.transform(rule, analyze.matchType('when', ({ color }) => { colorExpr = color }));
        //   if (!colorExpr) throw new Error('unablet to find when-color expression to auto-index then-turns');
        //
        //   turn = analyze.thenVal(analyze.member(value, colorExpr), mode);
        //   return analyze.then(state, color, turn);
        // }),

        analyze.matchType('member', ({ value, item }) => {
          switch (value.type) {
            case 'symbol':
            case 'identifier':
              return;
            default:
              const { type } = value;
              const name = scope.gen(`${type[0].toUpperCase()}${type.slice(1)}`);
              assigns.push(assign(name, value));
              return member(id(name), item);
          }
        }),

      );
      if (!xrule) {
        yield* comment([
          'eliminated by transform',
          ...JSON.stringify(rule, null, 2).split(/\n/)
        ]);
        return;
      }

      const { when, then } = xrule;
      for (const assign of assigns)
        yield* compileAssign(assign);
      yield* compileRuleBody(when, then);
    });
  }

  /**
   * @param {WhenNode} when
   * @param {ThenNode} then
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

    const thens = /** @type {({then: ThenValNode} & ThenDecl)[]} */ ([
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
      let isEmpty = true;

      const { mode } = then;
      if (mode !== '_') {
        const { value } = then;
        isEmpty = mode === '|' && compileValue(
          // ignore symbol defined check, all we care about here: "is the expression statically 0?"
          { has() { return true } }, value, opPrec.length) === '0';
      }

      return { then, isEmpty, ...decl };
    });
    if (thens.every(({ isEmpty }) => isEmpty)) return;

    /** @typedef {object} WhenDecl
     * @prop {string} name
     * @prop {string} cap
     * @prop {string} sym
     * @prop {string} max
     * @prop {string} [shift]
     * @prop {(cap: string) => string} [init]
     */

    const whens = /** @type {({when: AnyExpr} & WhenDecl)[]} */ ([
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

    {
      const maskParts = thens
        .map(({ then: { mode }, mask }) => mode === '=' ? mask : '')
        .filter(part => part);
      switch (maskParts.length) {
        case 0:
          break;

        case 1:
          scope.define('_priorMask');
          yield `const _priorMask = ~${maskParts[0]};`;
          yield '';
          break;

        default:
          scope.define('_priorMask');
          yield `const _priorMask = ~(${maskParts
            .reduce((mask, part) => `${mask}${mask ? ' | ' : ''}${part}`)});`;
          yield '';
      }
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
            scope.define(sym);
            yield `const ${sym} = ${keyExpr};`;
            if (init) yield init(cap);
            yield '';
            yield* compileWhenMatch(i + 1, sym);
          };

        yield* compileSpecComment(when, { head: `when ${name} matches: ` });

        switch (when.type) {
          case 'symbol':
          case 'expr':
            yield* amend(`for (let ${cap} = 0; ${cap} <= ${max}; ${cap}++) `, scope.block(function*() {
              scope.define(cap);

              const syms = [...freeSymbols(when, scope)];
              if (syms.length > 1) {
                throw new Error('matching more than one variable is unsupported');
              }
              const free = syms[0];
              if (!free) {
                throw new Error('no match variable');
              }
              scope.define(free);

              const matchExpr = solve(scope, free, cap, when);
              if (matchExpr === cap) {
                yield `const ${free} = ${matchExpr};`;
              } else {
                yield `const ${free} = (${max} + ${matchExpr}) % ${max};`;
                // TODO: gratuitous guard, only needed if division is involved
                yield `if (Math.floor(${free}) !== ${free}) continue;`;
              }

              yield* body();
            }));
            break;

          case 'number':
            scope.define(cap);
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

        for (const { name, then, max, shift } of thens) {
          const { mode } = then;

          if (mode !== '_') {
            const { value } = then;
            const comment = compileSpecComment(
              value,
              { head: `then ${name} ${mode}${mode == '=' ? '' : '='} ` });
            const expr = compileValue(scope, value, opPrec.length);
            if (expr !== '0') {
              // TODO &max is only valid if max is some 2^N-1, otherwise should use Math.min(max, ...)
              parts.push(`${expr} & ${max} ${[...comment].join('\n')}`);
            } else yield* comment;
          }

          if (parts.length && shift) {
            parts.push(`( ${reduceParts()}\n) << ${shift}`);
          }
        }

        if (scope.has('_priorMask')) {
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

/**
 * @param {Scope} scope
 * @param {string} name
 * @param {string[]} args
 * @param {() => Iterable<string>} body
 */
function compileFunction(scope, name, args, body) {
  const argNames = args.map(arg => {
    const match = /^(\w+)\s*=.*$/.exec(arg);
    return match ? match[1] : arg;
  });

  let func = 'function';

  const lastSpace = name.lastIndexOf(' ')
  if (lastSpace >= 0) {
    // keywords like export default async (static final frozen :S)
    func = `${name.slice(lastSpace)} ${func}`;
    name = name.slice(lastSpace + 1);
  }

  if (name.startsWith('*')) func = `${func}*`, name = name.slice(1);
  if (name) scope.define(name), func = `${func} ${name}`;

  return amend(`${func}(${args.join(', ')}) `, scope.block(function*() {
    scope.define(...argNames);
    yield* body();
  }));
}

/**
 * @param {Scope} scope
 * @param {string[]} args
 * @param {() => Iterable<string>} body
 */
function compileArrowFn(scope, args, body) {
  const argNames = args.map(arg => {
    const match = /^(\w+)\s*=.*$/.exec(arg);
    return match ? match[1] : arg;
  });
  return amend(`(${args.join(', ')}) => `, scope.block(function*() {
    scope.define(...argNames);
    yield* body();
  }));
}

/** @param {SpecNode} spec */
function countNumColors(spec) {
  let numColors = 0;
  analyze.transform(spec, node => {
    switch (node.type) {
      case 'directive': {
        const { name, value } = node;
        if (name !== 'numColors') return;
        const n = parseInt(value);
        if (!isNaN(n)) numColors = Math.max(numColors, n);
        break;
      }

      case 'ant':
      case 'turns': {
        const { turns } = node;
        numColors = Math.max(numColors, turns.length);
        break;
      }
    }
  });
  return numColors;
}

/** @typedef {ReturnType<makeScope>} Scope */

function makeScope() {
  /** @type {Set<string>[]} */
  const stack = [];

  /** @type {Set<string>} */
  let scope = new Set();

  function push() {
    stack.push(scope);
    scope = new Set([...scope]);
  }

  function pop() {
    scope = stack.pop() || new Set();
  }

  return {
    /// stack
    push, pop,

    /// current scope
    [Symbol.iterator]() {
      return scope[Symbol.iterator]();
    },

    /** @param {string} name */
    has(name) {
      return scope.has(name);
    },

    /** @param {string[]} names */
    define(...names) {
      for (const name of names) {
        if (scope.has(name))
          throw new Error(`redefinition of symbol ${name}`);
        scope.add(name);
      }
    },

    /// convenience utilities

    /** @param {string} name */
    gen(name) {
      for (let i = 1; /* TODO non-infinite? */; i++) {
        const uname = name + i;
        if (!scope.has(uname)) {
          return uname;
        }
      }
    },

    /** @param {(() => Iterable<string>)} body */
    *block(body) {
      push();
      yield* block(body());
      pop();
    },

  };
}

/**
 * @param {Scope} scope
 * @param {string} cap
 * @param {string} sym
 * @param {AnyExpr} expr - TODO what even does it mean to solve a turns expression; tighten?
 * @param {number} [outerPrec]
 * @returns {string}
 */
function solve(scope, cap, sym, expr, outerPrec = 0) {
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
   * @param {AnyExpr} expr
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

    yield compileValue(scope, expr);
  }
}

/**
 * @param {{has: (name: string) => boolean}} scope
 * @param {AnyExpr|TurnNode} node
 * @param {number} [outerPrec]
 * @returns {string}
 */
function compileValue(scope, node, outerPrec = 0) {
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
      const val1 = compileValue(scope, node.arg1, prec);
      const val2 = compileValue(scope, node.arg2, prec);
      const exprStr = `${val1} ${node.op} ${val2}`;
      return prec < outerPrec ? `(${exprStr})` : exprStr;

    case 'member':
      const baseVal = compileValue(scope, node.value, 0);
      const itemVal = compileValue(scope, node.item, opPrec.length);
      return `${baseVal}[${`${itemVal} % ${baseVal}.length`}]`;

    case 'symbol':
    case 'identifier':
      if (!scope.has(node.name)) {
        throw new Error(`undefined ${node.type} ${JSON.stringify(node.name)}`);
      }
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
 * @param {AnyExpr} expr
 * @param {{has: (name: string) => boolean}} symbols
 */
function* freeSymbols(expr, symbols) {
  for (const name of usedSymbols(expr)) {
    if (!symbols.has(name)) yield name;
  }
}

/** @param {AnyExpr} expr */
function usedSymbols(expr) {
  /** @type {Set<string>} */
  const used = new Set();
  analyze.transform(expr, analyze.matchType('symbol', ({ name }) => {
    used.add(name);
  }));
  return used;
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
