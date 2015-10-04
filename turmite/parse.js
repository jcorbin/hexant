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

    var re = /\s*\b(\d+)?(?:(B|P|L|F|R|S)|(NW|NO|NE|SE|SO|SW))\b\s*/g;
    str = str.toUpperCase();

    var i = 0;
    for (
        match = re.exec(str);
        match && i === match.index;
        i += match[0].length, match = re.exec(str)
    ) {
        var multurn = {
            mult: 0,
            turn: 0,
            sym: ''
        };
        multurn.mult = match[1] ? parseInt(match[1], 10) : 1;

        if (match[2]) {
            multurn.sym = match[2];
            multurn.turn = constants.RelSymbolTurns[match[2]];
        } else if (match[3]) {
            multurn.sym = match[3];
            multurn.turn = constants.AbsSymbolTurns[match[3]];
        }

        numColors += multurn.mult;
        if (numColors > World.MaxColor) {
            return new Result(
                new Error('too many colors needed for ant ruleset'),
                null);
        }
        multurns.push(multurn);
    }
    // TODO: check if didn't match full input

    return new Result(null, boundCompileAnt);

    function boundCompileAnt(turmite) {
        return compileAnt(multurns, turmite);
    }
}

function compileAnt(multurns, turmite) {
    // TODO: describe
    var numColors    = 0;
    var buildRuleStr = RLEBuilder('ant(', ' ', ')');
    var turns        = [];

    for (var i = 0; i < multurns.length; i++) {
        var mult = multurns[i].mult;
        for (var j = 0; j < mult; j++) {
            turns.push(multurns[i].turn);
        }
        numColors += multurns[i].mult;
        buildRuleStr(multurns[i].mult, multurns[i].sym);
    }

    turmite.clearRules();
    for (var c = 0; c <= World.MaxColor; c++) {
        var turn = turns[c % turns.length];
        var color = c + 1 & World.MaxColor;
        turmite.rules[c] = color << World.TurnShift | turn;
    }

    turmite.state      = 0;
    turmite.specString = buildRuleStr(0, '');
    turmite.numColors  = numColors;
    turmite.numStates  = 1;

    return new Result(null, turmite);
}
