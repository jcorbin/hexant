/* eslint no-multi-spaces:0 */

'use strict';

module.exports = parseTurmite;

var Result = require('rezult');
var World = require('../world.js');
var RLEBuilder = require('./rle-builder.js');
var constants = require('./constants.js');

function parseTurmite(str) {
    var parsers = [
        parseAnt
    ];
    for (var i = 0; i < parsers.length; i++) {
        var res = parsers[i](str);
        if (res.err || res.value) {
            return res;
        }
    }
    return new Result(new Error('invalid spec string'), null);
}

var antCompatPattern = /^\s*([lrwefaLRWEFA]+)\s*$/;
var antPattern = /^\s*ant\(\s*(.+?)\s*\)\s*$/;

var antCompatMap = {
    L: 'L',
    R: 'R',
    W: 'P',
    E: 'S',
    F: 'B',
    A: 'F'
};

function antCompatConvert(str) {
    str = str.toUpperCase();
    var equivMoves = [];
    for (var i = 0; i < str.length; i++) {
        var equivMove = antCompatMap[str[i]];
        if (equivMove === undefined) {
            return undefined;
        }
        equivMoves.push(equivMove);
    }
    return 'ant(' + equivMoves.join(' ') + ')';
}

function parseAnt(str) {
    var match = antCompatPattern.exec(str);
    if (match) {
        str = antCompatConvert(match[1]);
    }

    match = antPattern.exec(str);
    if (!match) {
        return new Result(null, null);
    }
    str = match[1];

    // we'll also build the canonical version of the parsed rule string in the
    // same pass as parsing it; rulestr will be that string, and we'll need
    // some state between arg matches
    var numColors = 0;
    var multurns  = [];

    parseArgs(/\s*(\d+)?(B|P|L|F|R|S)\s*/g, str.toUpperCase(),
        function eachArg(_, nStr, sym) {
            var mult = nStr ? parseInt(nStr, 10) : 1;
            var turn = constants.RelSymbolTurns[sym];
            numColors += mult;
            if (numColors > World.MaxColor) {
                return new Result(
                    new Error('too many colors needed for ant ruleset'),
                    null);
            }
            multurns.push({
                mult: mult,
                turn: turn,
                sym: sym
            });
        });

    return new Result(null, boundCompileAnt);

    function boundCompileAnt(turmite) {
        return compileAnt(multurns, turmite);
    }
}

function compileAnt(multurns, turmite) {
    // TODO: describe
    var numColors    = 0;
    var color        = 0;
    var turn         = 0;
    var stateKey     = 0 << World.ColorShift;
    var rule         = stateKey | color;
    var nextRule     = rule;
    var buildRuleStr = RLEBuilder('ant(', ' ', ')');

    turmite.clearRules();
    for (var i = 0; i < multurns.length; i++) {
        turn = multurns[i].turn;
        var mult = multurns[i].mult;
        for (var j = 0; j < mult; j++) {
            nextRule            = stateKey | ++color & World.MaxColor;
            turmite.rules[rule] = nextRule << World.TurnShift | turn;
            rule                = nextRule;
        }
        numColors += multurns[i].mult;
        buildRuleStr(multurns[i].mult, multurns[i].sym);
    }

    // now that we've compiled the base case, we need to cover the rest of
    // the (state, color) key space for numColors < color <=
    // World.MaxColor; this essentially pre-computes "color modulo
    // numColors" as a static rule table lookup so that no modulo logic is
    // required in .step below (at least explicitly, since unsigned integer
    // wrap-around is modulo 2^bits)
    while (color > 0 && color <= World.MaxColor) {
        var baseRule        = stateKey |   color % numColors;
        nextRule            = stateKey | ++color & World.MaxColor;
        turn                = turmite.rules[baseRule] & 0x0000ffff;
        turmite.rules[rule] = nextRule << World.TurnShift | turn;
        rule                = nextRule;
    }

    turmite.state      = 0;
    turmite.specString = buildRuleStr(0, '');
    turmite.numColors  = numColors;
    turmite.numStates  = 1;

    return new Result(null, turmite);
}

function parseArgs(re, str, each) {
    var i = 0;
    for (
        var match = re.exec(str);
        match && i === match.index;
        i += match[0].length, match = re.exec(str)
    ) {
        each.apply(null, match);
    }

    // TODO: check if didn't match full input
}
