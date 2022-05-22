// @ts-check

import * as rezult from '../../rezult.js';
import * as constants from '../constants.js';

import { analyze } from './analyze.js';
import { toSpecString } from './tostring.js';
import * as walk from './walk.js';

/** @typedef {import('./analyze.js').analysis} analysis */

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

/** @typedef {object} Spec
 * @prop {string} specString - a canonicalized version of the string that was parsed
 * @prop {number} numColors - how many colors are needed by this turmite spec
 * @prop {(World: RuleConstants, _rules: Rules) => {states: Set<number>}} build
 */

/**
 * @param {walk.SpecNode} spec
 * @returns {rezult.Result<Spec>}
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

    if (typeof value != 'object') {
      return rezult.error(new Error(
        `invalid spec result, expected an object, got ${typeof value}`))
    }

    for (const [field, type] of [
      ['specString', 'string'],
      ['numColors', 'number'],
      ['build', 'function'],
    ]) {
      if (!(field in value)) {
        return rezult.error(new Error(
          `invalid spec result, missing ${field} field`))
      }

      const vt = typeof value[field];
      if (vt != type) {
        return rezult.error(new Error(
          `invalid spec result, invalid ${field} field, expected ${type}, got ${vt}`))
      }
    }

    return rezult.just(/** @type {Spec} */(value));
  });
}

/** @typedef {"value"|"module"} CodeFormat */

/**
 * @param {walk.SpecNode} spec
 * @param {object} [options]
 * @param {CodeFormat} [options.format]
 */
export function compileCode(spec, { format = 'value' } = {}) {
  const symbols = new Set([
    // dependencies
    'World',

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
    yield* wrap({
      head: `{`,
      cont: '  ',
      foot: `}`,
    }, compileModule(spec, {
      propHead: name => `${name}: `,
      propFoot: `,`,
      methodHead: sig => `${sig} {`,
      methodFoot: '},',
    }));
  }

  /**
   * @param {walk.SpecNode} spec
   * @param {object} [options]
   * @param {(name: string) => string} [options.propHead]
   * @param {string} [options.propFoot]
   * @param {(sig: string) => string} [options.methodHead]
   * @param {string} [options.methodFoot]
   */
  function* compileModule(spec, {
    propHead = name => `export const ${name} = `,
    propFoot = ';',
    methodHead = sig => `export function ${sig} {`,
    methodFoot = '}',
  } = {}) {
    yield* amend({
      head: propHead('specString'),
      cont: '  ',
      zero: `''`,
      foot: propFoot,
    }, multiLineQuoted(toSpecString(spec)));
    yield '';

    // NOTE: analysis delayed until after spec string above, since one of its
    // products is to mutate the AST for things like hoisting of intermediate
    // values

    // TODO it'd be great to refactor the analysis module to separate turn
    // counting from AST transforming passes like intermediate value hoisting

    const { maxTurns } = rezult.toValue(analyze(spec, symbols));

    yield `${propHead('numColors')}${maxTurns}${propFoot}`;
    yield '';

    yield* wrap({
      head: methodHead('build(World, _rules)'),
      cont: '  ',
      zero: 'throw new Error("unimplemented")',
      foot: methodFoot,
    }, compileRuleBuilder());
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

  function* compileRuleBuilder() {
    yield 'const _states = new Set();';
    yield '';

    for (const assign of spec.assigns) {
      yield* compileSpecComment(assign, { head: 'assign: ' });
      yield* compileAssign(assign);
      yield '';
    }

    for (const rule of spec.rules) {
      yield* compileSpecComment(rule, { head: 'rule: ' });
      yield* wrap({
        head: `{`,
        cont: '  ',
        foot: `}`,
      }, compileRule(rule.when, rule.then));
      yield '';
    }

    yield 'return {states: _states};';
  }

  /** @param {walk.AssignNode} assign */
  function* compileAssign({ id: { name }, value }) {
    yield `let ${name} = ${compileValue(value)};`; // TODO can this be constified?
  }

  /**
   * @param {walk.WhenNode} when
   * @param {walk.ThenNode} then
   */
  function* compileRule(
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

    const mask = thens
      .map(({ then: { mode }, mask }) => mode === '=' ? mask : '')
      .reduce((mask, part) => `${mask}${mask ? ' | ' : ''}${part}`);
    if (mask) {
      yield `const _priorMask = ~(${mask});`;
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

            yield* wrap({
              head: `for (let ${cap} = 0; ${cap} <= ${max}; ${cap}++) {`,
              foot: '}',
              cont: '  ',
            }, chain(
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
        let anyResult = false;
        for (const { name, then, expr, max, shift } of thens) {
          if (then.mode !== '_') {
            const { value, mode } = then;
            yield* compileSpecComment(value, { head: `then ${name} ${mode}${mode == '=' ? '' : '='} ` });
          }

          if (expr !== null) {
            // TODO &max is only valid if max is some 2^N-1, otherwise should use Math.min(max, ...)
            const valRes = `${expr} & ${max}`;
            const resVal = anyResult ? `_result | ${valRes}` : valRes;
            const newVal = shift ? `(${resVal}) << ${shift}` : resVal;
            if (!anyResult) {
              anyResult = true;
              yield `let _result = ${newVal};`;
            } else {
              yield `_result = ${newVal};`;
            }
          } else if (anyResult && shift) {
            yield `_result <<= ${shift};`;
          }
        }
        if (anyResult) {
          yield `_rules[${priorKey}] = _rules[${priorKey}]${mask ? ' & _priorMask' : ''} | _result;`;
        }
      }
    }
  }
}

/**
 * @param {string} cap
 * @param {string} sym
 * @param {walk.Expr<walk.NumberNode | walk.TurnsNode>} expr - TODO what even does it mean to solve a turns expression; tighten?
 * @param {number} [outerPrec]
 */
function solve(cap, sym, expr, outerPrec = 0) {
  const invOp = {
    '+': '-',
    '*': '/',
    '-': '+',
    '/': '*'
  };

  switch (expr.type) {

    case 'expr':
      const leftHasSym = usedSymbols(expr.arg1).has(cap);
      const rightHasSym = usedSymbols(expr.arg2).has(cap);
      if (!leftHasSym && !rightHasSym) {
        return compileValue(expr, outerPrec);
      }

      if (leftHasSym && rightHasSym) {
        // TODO: solve each side to intermediate values
        throw new Error('matching complex expressions not supported');
      }

      const prec = opPrec.indexOf(expr.op);
      let sol1 = solve(cap, sym, expr.arg1, prec);
      let sol2 = solve(cap, sym, expr.arg2, prec);
      let str = '';

      switch (expr.op) {

        case '+':
        case '*':
          // color = c [*+] 6 = 6 [*+] c
          // c = color [/-] 6
          if (rightHasSym) {
            [sol1, sol2] = [sol2, sol1];
          }
          str += `${sol1} ${invOp[expr.op]} ${sol2}`;
          break;

        case '-':
        case '/':
          if (leftHasSym) {
            // color = c [-/] 6
            // c = color [+*] 6
            str += `${sol1} ${invOp[expr.op]} ${sol2}`;
          } else if (rightHasSym) {
            // color = 6 [-/] c
            // c = 6 [-/] color
            str += `${sol2} ${expr.op} ${sol1}`;
          }
          str += `${sol1} ${invOp[expr.op]} ${sol2}`;
          break;

        case '%':
          throw new Error(`unimplemented modulo operator solving`);

        default:
          assertNever(expr.op, 'invalid expression operator');
      }

      if (prec < outerPrec) {
        str = `(${str});`
      }
      return str;

    case 'symbol':
      if (expr.name === cap) {
        return sym;
      }
      return expr.name;

    default:
      return compileValue(expr);
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
      for (const { count, turn } of node.value) {
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

/**
 * @param {amendments} params
 * @param {Iterable<string>} lines
 */
function* wrap({ head = '', foot = '', cont = '', zero = 'undefined' }, lines) {
  if (head) {
    yield head;
  }
  let any = false;
  for (const line of lines) {
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
 * @param {amendments} params
 * @param {Iterable<string>} lines
 */
function* amend({ head = '', foot = '', cont = '', zero = 'undefined' }, lines) {
  let last = '', any = false;
  for (const line of lines) {
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
