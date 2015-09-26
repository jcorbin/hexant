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
    W: 'BL',
    E: 'BR',
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
    var numStates    = 1;
    var numColors    = 0;
    var multurns     = [];
    var buildRuleStr = RLEBuilder('ant(', ' ', ')');

    parseArgs(/\s*(\d+)?(B|BL|L|F|R|BR)\s*/g, str.toUpperCase(),
        function eachArg(_, nStr, sym) {
            var mult = nStr ? parseInt(nStr, 10) : 1;
            var relturn = constants.RelSymbolTurns[sym];
            numColors += mult;
            if (numColors > World.MaxColor) {
                return new Result(
                    new Error('too many colors needed for ant ruleset'),
                    null);
            }
            multurns.push({
                mult: mult,
                relturn: relturn
            });
            buildRuleStr(mult, sym);
        });
    var rulestr = buildRuleStr(0, '');

    return new Result(null, compileAnt);

    function compileAnt(turmite) {
        // TODO: describe
        var state    = 0;
        var color    = 0;
        var stateKey = state << 8;
        var rule     = stateKey | color;
        var nextRule = rule;

        for (var i = 0; i < multurns.length; i++) {
            var mult = multurns[i].mult;
            var relturn = multurns[i].relturn;
            for (var j = 0; j < mult; j++) {
                nextRule            = stateKey | ++color & World.MaxColor;
                turmite.rules[rule] = nextRule << 16 | relturn;
                rule                = nextRule;
            }
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
            var turn            = turmite.rules[baseRule] & 0x0000ffff;
            turmite.rules[rule] = nextRule << 16 | turn;
            rule                = nextRule;
        }

        turmite.state      = state;
        turmite.specString = rulestr;
        turmite.numColors  = numColors;
        turmite.numStates  = numStates;

        return new Result(null, turmite);
    }
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
