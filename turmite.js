'use strict';

/* eslint no-multi-spaces:0 consistent-this:0 */

var Coord = require('./coord.js');
var World = require('./world.js');
var CubePoint = Coord.CubePoint;

module.exports = Turmite;

/*
 * state, color -> nextState, write, turn
 *
 * index struct {
 *     state u8
 *     color u8
 * }
 *
 * rule struct {
 *     nextState u8
 *     write     u8
 *     turn      u16 // bit-field
 * }
 *
 * relative turns
 *    F -- +0 -- no turn, forward
 *    B -- +3 -- u turn, backaward
 *   BL -- -2 -- double left turn
 *    L -- -1 -- left turn
 *    R -- +1 -- right turn
 *   BR -- +2 -- double right turn
 *
 * absolute turns (for "flat-top" (odd or even q)
 *   NW -- ? -- North West
 *    N -- ? -- North
 *   NE -- ? -- North East
 *   SE -- ? -- South East
 *    S -- ? -- South
 *   SW -- ? -- South West
 */

var Turn            = {};
Turn.RelForward     = 0x0001;
Turn.RelBackward    = 0x0002;
Turn.RelLeft        = 0x0004;
Turn.RelRight       = 0x0008;
Turn.RelDoubleLeft  = 0x0010;
Turn.RelDoubleRight = 0x0020;
Turn.AbsNorthWest   = 0x0040;
Turn.AbsNorth       = 0x0080;
Turn.AbsNorthEast   = 0x0100;
Turn.AbsSouthEast   = 0x0200;
Turn.AbsSouth       = 0x0400;
Turn.AbsSouthWest   = 0x0800;

var RelTurnDelta                  = [];
RelTurnDelta[Turn.RelBackward]    =  3;
RelTurnDelta[Turn.RelDoubleLeft]  = -2;
RelTurnDelta[Turn.RelLeft]        = -1;
RelTurnDelta[Turn.RelForward]     =  0;
RelTurnDelta[Turn.RelRight]       =  1;
RelTurnDelta[Turn.RelDoubleRight] =  2;

var AbsTurnDir                = [];
AbsTurnDir[Turn.AbsSouthEast] = 0;
AbsTurnDir[Turn.AbsSouth]     = 1;
AbsTurnDir[Turn.AbsSouthWest] = 2;
AbsTurnDir[Turn.AbsNorthWest] = 3;
AbsTurnDir[Turn.AbsNorth]     = 4;
AbsTurnDir[Turn.AbsNorthEast] = 5;

var RelTurnSymbols                  = [];
RelTurnSymbols[Turn.RelBackward]    = 'B';
RelTurnSymbols[Turn.RelDoubleLeft]  = 'BL';
RelTurnSymbols[Turn.RelLeft]        = 'L';
RelTurnSymbols[Turn.RelForward]     = 'F';
RelTurnSymbols[Turn.RelRight]       = 'R';
RelTurnSymbols[Turn.RelDoubleRight] = 'BR';

var RelSymbolTurns = [];
RelSymbolTurns.B   = Turn.RelBackward;
RelSymbolTurns.BL  = Turn.RelDoubleLeft;
RelSymbolTurns.L   = Turn.RelLeft;
RelSymbolTurns.F   = Turn.RelForward;
RelSymbolTurns.R   = Turn.RelRight;
RelSymbolTurns.BR  = Turn.RelDoubleRight;

Turmite.ruleHelp =
    '\nant(<number>?<turn> ...) , turns:\n' +
    '  - L=left, R=right\n' +
    '  - B=back, F=forward\n' +
    '  - BL=back-left BR=back-right\n'
    ;

Turmite.Kinds = {
    'ant': parseAnt
};

function parseAnt(str, turmite) {
    str = str.toUpperCase();

    // we'll also build the canonical version of the parsed rule string in the
    // same pass as parsing it; rulestr will be that string, and we'll need
    // some state between arg matches
    var rulestr = '';
    var lastSym = '';
    var lastSymCount = 0;

    // TODO: describe
    var state    = 0;
    var color    = 0;
    var stateKey = state << 8;
    var rule     = stateKey | color;

    parseArgs(/\s*(\d+)?(B|BL|L|F|R|BR)\s*/g, str,
        function eachArg(_, nStr, sym) {
            var mult = nStr ? parseInt(nStr, 10) : 1;
            for (var j = 0; j < mult; j++) {
                if (color > World.MaxColor) {
                    return new Error('too many colors needed for ant ruleset');
                }
                var nextRule        = stateKey | ++color & World.MaxColor;
                turmite.rules[rule] = nextRule << 16 | RelSymbolTurns[sym];
                rule                = nextRule;
            }
            growRuleStr(mult, sym);
        });
    growRuleStr(0, '');

    // now that we've compiled the base case, we need to cover the rest of the
    // (state, color) key space for numColors < color <= World.MaxColor; this
    // essentially pre-computes "color modulo numColors" as a static rule table
    // lookup so that no modulo logic is required in .step below (at least
    // explicitly, since unsigned integer wrap-around is modulo 2^bits)
    var numColors = color;
    while (color > 0 && color <= World.MaxColor) {
        var baseRule        = stateKey |   color % numColors;
        var nextRule        = stateKey | ++color & World.MaxColor;
        var turn            = turmite.rules[baseRule] & 0x0000ffff;
        turmite.rules[rule] = nextRule << 16 | turn;
        rule                = nextRule;
    }

    turmite.state = state;
    turmite.specString = 'ant(' + rulestr + ')';
    turmite.numColors = numColors;
    turmite.numStates = 1;

    return null;

    function growRuleStr(mult, sym) {
        if (lastSym !== sym) {
            if (lastSym && lastSymCount) {
                if (rulestr.length) {
                    rulestr += ' ';
                }
                if (lastSymCount > 1) {
                    rulestr += lastSymCount.toString();
                }
                rulestr += lastSym;
            }
            lastSym = sym;
            lastSymCount = 0;
        }
        lastSymCount += mult;
    }
}

function Turmite(world, rules) {
    this.numStates = 0;
    this.numColors = 0;
    this.rules = rules || new Uint32Array(64 * 1024);
    this.specString = '';

    this.dir = 0;
    this.oldDir = 0;

    this.pos = CubePoint(0, 0, 0);
    this.oldPos = CubePoint(0, 0, 0);

    this.state = 0;
    this.stateKey = 0;

    this.size = 0.5;
    this.index = 0;
    this.world = world;
}

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

Turmite.prototype.parse =
function parseTurmite(str) {
    var match = /^\s*(\w+)\(\s*(.+?)\s*\)\s*$/.exec(str);
    if (!match) {
        var equivAnt = antCompatConvert(str);
        if (equivAnt !== undefined) {
            return this.parse(equivAnt);
        }
        return new Error('invalid spec string');
    }
    var kind = match[1].toLowerCase();
    var args = match[2];

    var parseKind = Turmite.Kinds[kind];
    if (!parseKind) {
        return new Error('no such turmite kind');
    }

    return parseKind(args, this);
};

Turmite.prototype.toString =
function toString() {
    if (this.specString) {
        return this.specString;
    }
    return '<UNKNOWN turmite>';
};

Turmite.prototype.step =
function step() {
    var tile = this.world.tile;
    var data = tile.get(this.pos);
    var color = data & 0x00ff;
    var flags = data & 0xff00;

    var ruleIndex = this.stateKey | color;
    var rule = this.rules[ruleIndex];
    var turn = rule & 0x0000ffff;
    var write = (rule & 0x00ff0000) >> 16;
    var nextState = (rule & 0xff000000) >> 24;

    flags |= 0x0100; // TODO: World constant
    data = flags | write;
    tile.set(this.pos, data);

    this.oldDir = this.dir;
    this.oldPos.copyFrom(this.pos);

    if (nextState !== this.state) {
        this.state = nextState;
        this.stateKey = nextState << 8;
    }

    turn = this.executeTurn(turn);
    this.pos.add(CubePoint.basis[this.dir]);
    if (turn !== 0) {
        throw new Error('turmite forking unimplemented');
    }

    // TODO: WIP
    // var self = null;
    // while (turn !== 0) {
    //     if (self) {
    //         self = self.fork();
    //     } else {
    //         self = this;
    //     }
    //     turn = self.executeTurn(turn);
    //     self.pos.add(CubePoint.basis[self.dir]);
    // }
};

// TODO: WIP
// Turmite.prototype.fork =
// function fork() {
//     // TODO: ability to steal an already allocated ant from world pool
//     var self = new Turmite(this.world, this.rules);

//     // self.world = this.world;
//     // self.rules = this.rules;

//     self.numStates = this.numStates;
//     self.numColors = this.numColors;
//     self.specString = this.specString;
//     self.dir = this.oldDir;
//     self.oldDir = this.oldDir;
//     self.pos.copyFrom(this.oldPos);
//     self.oldPos.copyFrom(this.oldPos);
//     self.state = this.state;
//     self.stateKey = this.stateKey;
//     self.size = this.size;
//     self.index = this.index;

//     // TODO: add to world

//     return self;
// };

Turmite.prototype.executeTurn =
function executeTurn(turn) {
    var t = 1;
    for (; t <= 0x0020; t <<= 1) {
        if (turn & t) {
            this.dir = (6 + this.oldDir + RelTurnDelta[t]) % 6;
            return turn & ~t;
        }
    }
    for (; t <= 0x0800; t <<= 1) {
        if (turn & t) {
            this.dir = AbsTurnDir[t];
            return turn & ~t;
        }
    }
    // TODO: assert that turn is 0?
    return 0;
};

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

// function main() {
//     var turm = new Turmite(null);
//     var err = Turmite.parse('ant(L R LL RRR 5L 8R 13L 21R)', turm);
//     if (err) {
//         console.error(err);
//     } else {
//         // console.log(turm.toString());
//         console.log(
//             // turm.rules
//             new Buffer(
//                 new Uint8Array(turm.rules.buffer)
//             ).toString()
//         );
//     }
// }
// main();
