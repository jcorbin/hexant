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

/**
 * @param {walk.SpecNode} spec
 * @param {object} [options]
 * @param {"value"|"module"} [options.format]
 */
function compileCode(spec, { format = 'value' } = {}) {
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
    `_prior`,
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

  /** @param {walk.Node} node */
  function* compileSpecComment(node) {
    yield* comment(toSpecString(node));
  }

  function* compileRuleBuilder() {
    for (const assign of spec.assigns) {
      yield* compileSpecComment(assign);
      yield* compileAssign(assign);
      yield '';
    }

    yield 'const _states = new Set();';
    yield '';

    for (const rule of spec.rules) {
      yield* compileSpecComment(rule);
      // TODO maybe contain each rule in its own scope? iife?
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
    yield* compileWhenMatch(whenState, '_state', 'World.MaxState', function*() {
      yield `_states.add(_state);`;
      yield `const _stateKey = _state << World.ColorShift;`;
      yield '';

      yield* compileWhenMatch(whenColor, '_color', 'World.MaxColor', function*() {
        yield `const _colorKey = _stateKey|_color;`;
        yield '';

        let anyResult = false;
        for (const { value, max, shift } of ([
          { value: thenState.value, max: 'World.MaxState', shift: 'World.ColorShift' },
          { value: thenColor.value, max: 'World.MaxColor', shift: 'World.TurnShift' },
          { value: thenTurn.value, max: 'World.MaxTurn', shift: '' },
        ])) {
          let valStr = compileValue(value, opPrec.length);
          if (valStr !== '0') {
            if (!anyResult) {
              anyResult = true;
              yield `let _result = ${valStr} & ${max};`;
            } else {
              yield `_result |= ${valStr} & ${max};`;
            }
          }
          if (anyResult && shift) {
            yield `_result <<= ${shift};`;
            yield ``;
          }
        }

        const maskParts = [];
        if (thenState.mode === '=') {
          maskParts.push('World.MaskResultState');
        }
        if (thenColor.mode === '=') {
          maskParts.push('World.MaskResultColor');
        }
        maskParts.push('World.MaskResultTurn');

        yield `const _prior = _rules[_colorKey];`;
        if (anyResult) {
          yield `_rules[_colorKey] = _prior & ~(${maskParts.join(' | ')}) | _result;`;
        } else {
          yield `_rules[_colorKey] = _prior & ~(${maskParts.join(' | ')});`;
        }

      });
    }
    )
  }

  /**
   * @param {walk.Node} node
   * @param {string} sym
   * @param {string} max
   * @param {() => Iterable<string>} body
   */
  function* compileWhenMatch(node, sym, max, body) {
    switch (node.type) {
      case 'symbol':
      case 'expr':
        const syms = [...freeSymbols(node, symbols)];
        if (syms.length > 1) {
          throw new Error('matching more than one variable is unsupported');
        }

        const cap = syms[0];
        if (!cap) {
          throw new Error('no match variable');
        }

        const matchExpr = solve(cap, sym, node);

        yield `for (let ${sym} = 0; ${sym} <= ${max}; ${sym}++) {`;
        yield* indent(matchExpr === sym
          ? chain(
            `let ${cap} = ${matchExpr};`,
            body(),
          )
          : chain(
            `let ${cap} = ${max} + ${matchExpr} % ${max};`,
            // TODO: gratuitous guard, only needed if division is involved
            `if (Math.floor(${cap}) === ${cap}) {`,
            indent(body()),
            '}',
          )
        );
        yield '}';
        break;

      case 'number':
        yield `let ${sym} = ${node.value};`;
        yield* body();
        break;

      default:
        throw new Error(`unsupported match type ${node.type}`);
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
function* indent(lines, indent = '  ') {
  yield* prefix(indent, lines);
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
function* endLines(lines, nl = '\n') {
  for (const line of lines) {
    yield line + nl;
  }
}

/**
 * @param {object} params
 * @param {string} [params.head] - prefix for the first line
 * @param {string} [params.foot] - suffix for the last line
 * @param {string} [params.cont] - prefix for all lines after the first
 * @param {string} [params.zero] - filler value when lines is empty
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
 * @param {object} params
 * @param {string} [params.head] - prefix for the first line
 * @param {string} [params.foot] - suffix for the last line
 * @param {string} [params.cont] - prefix for all lines after the first
 * @param {string} [params.zero] - filler value when lines is empty
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
