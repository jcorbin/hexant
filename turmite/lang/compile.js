'use strict';

var constants = require('../constants.js');
var analyze = require('./analyze.js');
var symToTstring = require('./tostring.js');
var solve = require('./solve.js');
var walk = require('./walk.js');

// TODO: de-dupe
var opPrec = [
    '+',
    '-',
    '*',
    '/',
    '%'
];

function compileInit(spec) {
    var scope = {
        _ent: 'turmite',
        numStates: 0,
        numColors: 0
    };

    analyze(spec, scope);

    var bodyLines = [
        'var numStates = ' + scope.numStates + ';',
        'var numColors = ' + scope.numColors + ';'
    ];
    bodyLines = compileSpec(spec, scope, bodyLines);
    bodyLines.push(
        '',
        scope._ent + '.numStates = numStates;',
        scope._ent + '.numColors = numColors;',
        '',
        'return new Result(null, ' + scope._ent + ');');

    var lines = [];
    lines.push('function init(' + scope._ent + ') {');
    pushWithIndent(lines, bodyLines);
    lines.push('}');

    return closeit(['World', 'Result'], 'init', lines);
}

function compileSpec(spec, scope, lines) {
    for (var i = 0; i < spec.assigns.length; i++) {
        var assign = spec.assigns[i];
        lines = lines.concat(compileAssign(assign, scope));
        lines.push('');
    }
    lines = lines.concat(compileRules('rules', spec.rules, scope));
    return lines;
}

function compileRules(myName, rules, scope) {
    scope._state  = '_state';
    scope._color  = '_color';
    scope._key    = '_key';
    scope._result = '_res';
    scope._states = '_states';

    var lines = [];

    lines.push(
        'var ' + scope._states + ' = {};',
        'function countState(state) {',
        '    if (!' + scope._states + '[state]) {',
        '        ' + scope._states + '[state] = true;',
        '        numStates++;',
        '    }',
        '}',
        'var ' + [
            scope._state,
            scope._color,
            scope._key,
            scope._result
        ].join(', ') + ';',
        scope._ent + '.clearRules();'
    );

    rules.forEach(function eachRule(rule, i) {
        symToTstring(rule, function each(line) {
            if (i < rules.length - 1) {
                line += '\n';
            }
            lines.push(
                '',
                scope._ent + '.specString += ' +
                JSON.stringify(line) + ';');
        });

        lines = lines.concat(compileRule(rule, scope));
    });

    return lines;
}

function compileRule(rule, scope) {
    // XXX: api shift
    return compileWhen([], rule.when, scope, function underWhen(innerLines) {
        return compileThen(innerLines, rule.then, scope, noop);
    });
}

function compileWhen(outerLines, when, scope, body) {
    return compileWhenMatch({
        sym: scope._state,
        max: 'World.MaxState',
        count: 'countState'
    }, when.state, outerLines, whenStateBody, scope);

    function whenStateBody(lines) {
        lines.push(scope._key + ' = ' + scope._state + ' << World.ColorShift;');

        return compileWhenMatch({
            sym: scope._color,
            max: 'World.MaxColor',
            count: null
        }, when.color, lines, whenColorBody, scope);
    }

    function whenColorBody(lines) {
        lines = body(lines);
        return lines;
    }
}

function compileWhenMatch(varSpec, node, lines, body, scope) {
    var matchBody = varSpec.count ? countedBody : body;

    switch (node.type) {
    case 'symbol':
    case 'expr':
        return compileWhenLoop(varSpec, node, lines, matchBody, scope);

    case 'number':
        lines.push(varSpec.sym + ' = ' + node.value + ';');
        return matchBody(lines);

    default:
        throw new Error('unsupported match type ' + node.type);
    }

    function countedBody(bodyLines) {
        bodyLines.push(varSpec.count + '(' + varSpec.sym + ');');
        return body(bodyLines);
    }
}

function compileWhenLoop(varSpec, node, lines, body, scope) {
    lines.push('for (' +
               varSpec.sym + ' = 0; ' +
               varSpec.sym + ' <= ' + varSpec.max + '; ' +
               varSpec.sym + '++' +
               ') {');
    var bodyLines = compileWhenExprMatch(varSpec, node, [], body, scope);
    pushWithIndent(lines, bodyLines);
    lines.push('}');
    return lines;
}

function compileWhenExprMatch(varSpec, node, lines, body, scope) {
    var syms = freeSymbols(node, scope);
    if (syms.length > 1) {
        throw new Error('matching more than one variable is unsupported');
    }
    var cap = syms[0];
    if (!cap) {
        throw new Error('no match variable');
    }

    var matchExpr = solve(cap, varSpec.sym, node, scope, 0);
    if (matchExpr === varSpec.sym) {
        lines.push('var ' + cap + ' = ' + matchExpr + ';');
        return body(lines);
    }

    matchExpr = varSpec.max + ' + ' + matchExpr + ' % ' + varSpec.max;
    lines.push('var ' + cap + ' = ' + matchExpr + ';');
    // TODO: gratuitous guard, only needed if division is involved
    lines.push('if (Math.floor(' + cap + ') === ' + cap + ') {');
    pushWithIndent(lines, body([]));
    lines.push('}');
    return lines;
}

function freeSymbols(node, scope) {
    var seen = {};
    var res = [];
    walk.iter(node, each);
    return res;

    function each(child, next) {
        if (child.type === 'symbol' &&
            scope[child.name] === undefined &&
            !seen[child.name]) {
            seen[child.name] = true;
            res.push(child.name);
        }
        next();
    }
}

function compileThen(lines, then, scope, body) {
    var before = lines.length;
    var mask = compileThenParts(lines, then, scope);
    var after = lines.length;

    var dest = scope._ent + '.rules[' +
        scope._key + ' | ' + scope._color +
    ']';

    if (mask) {
        lines.push(dest + ' &= ~' + mask + ';');
    }

    if (after > before) {
        lines.push(dest + ' |= ' + scope._result + ';');
    }

    return body(lines);
}

function compileThenParts(lines, then, scope) {
    var valMaxes = ['World.MaxState', 'World.MaxColor', 'World.MaxTurn'];
    var shifts = ['World.ColorShift', 'World.TurnShift'];

    var allZero = true;
    var parts = [then.state, then.color, then.turn];
    var maskParts = [];

    for (var i = 0; i < parts.length; i++) {
        var mode = '|';
        var value = parts[i];

        var valStr = compileValue(value, scope);
        if (valStr !== '0') {
            if (value.type === 'expr') {
                valStr = '(' + valStr + ')';
            }
            valStr += ' & ' + valMaxes[i];

            if (allZero) {
                allZero = false;
                lines.push(scope._result + ' = ' + valStr + ';');
            } else {
                lines.push(scope._result + ' |= ' + valStr + ';');
            }
        }
        if (i < shifts.length && !allZero) {
            lines.push(scope._result + ' <<= ' + shifts[i] + ';');
        }
    }

    var mask = maskParts.join(' | ');
    if (maskParts.length > 1) {
        mask = '(' + mask + ')';
    }

    return mask;
}

function compileValue(node, scope, outerPrec) {
    if (!outerPrec) {
        outerPrec = 0;
    }

    switch (node.type) {

    case 'expr':
        var prec = opPrec.indexOf(node.op);
        var arg1 = compileValue(node.arg1, scope, prec);
        var arg2 = compileValue(node.arg2, scope, prec);
        var exprStr = arg1 + ' ' + node.op + ' ' + arg2;
        if (prec < outerPrec) {
            return '(' + exprStr + ')';
        }
        return exprStr;

    case 'member':
        // TODO error if scope[sym] === 'undefined'
        var valRepr = compileValue(node.value, scope, 0);
        var item = compileValue(node.item, scope, opPrec.length);
        item = item + ' % ' + valRepr + '.length';
        return valRepr + '[' + item + ']';

    case 'symbol':
    case 'identifier':
        return node.name;

    case 'turn':
        return node.names.reduce(
            function orEachTurn(turn, name) {
                return turn | constants.Turn[name];
            }, 0);

    case 'number':
        return node.value.toString();

    case 'turns':
        return compileTurns(node.value);

    default:
        return '/* ' + JSON.stringify(node) + ' */ undefined';
    }
}

function compileAssign(assign, scope) {
    var lines = [];
    symToTstring(assign, function each(line) {
        line += '\n';
        lines.push(
            '',
            scope._ent + '.specString += ' +
            JSON.stringify(line) + ';');
    });

    lines.push(
        'var ' + assign.id.name + ' = ' +
        compileValue(assign.value) + ';');

    return lines;
}

function compileTurns(turns) {
    var parts = [];
    for (var i = 0; i < turns.length; i++) {
        var item = turns[i];
        var turn = constants.Turn[item.turn];
        var turnStr = '0x' + zeropad(2, turn.toString(16));
        for (var j = 0; j < item.count.value; j++) {
            parts.push(turnStr);
        }
    }
    return '[' + parts.join(', ') + ']';
}

function zeropad(width, str) {
    while (str.length < width) {
        str = '0' + str;
    }
    return str;
}

function pushWithIndent(outer, inner) {
    for (var i = 0; i < inner.length; i++) {
        var line = inner[i];
        if (line) {
            line = '    ' + line;
        }
        outer.push(line);
    }
    return outer;
}

function closeit(args, ret, body) {
    var argStr = args.join(', ');
    var lines = [];
    lines.push('(function(' + argStr + ') {');
    lines = lines.concat(body);
    lines.push(
        '',
        'return ' + ret + ';',
        '})(' + argStr + ');');
    return lines;
}

function noop(lines) {
    return lines;
}

module.exports.assign        = compileAssign;
module.exports.init          = compileInit;
module.exports.rule          = compileRule;
module.exports.rules         = compileRules;
module.exports.spec          = compileSpec;
module.exports.then          = compileThen;
module.exports.turns         = compileTurns;
module.exports.value         = compileValue;
module.exports.when          = compileWhen;
module.exports.whenExprMatch = compileWhenExprMatch;
module.exports.whenLoop      = compileWhenLoop;
module.exports.whenMatch     = compileWhenMatch;
